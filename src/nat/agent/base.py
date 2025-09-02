# SPDX-FileCopyrightText: Copyright (c) 2025, NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import asyncio
import json
import logging
from abc import ABC
from abc import abstractmethod
from enum import Enum
from typing import Any

from colorama import Fore
from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.messages import BaseMessage
from langchain_core.messages import ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool
from langgraph.graph.graph import CompiledGraph

logger = logging.getLogger(__name__)


def detect_large_tool_output_configs(tool_names: list, builder, max_tool_response_chars: int | None) -> dict:
    """
    Detect large tool output retriever configurations from the provided tool names.
    This function performs introspection to identify tools that can retrieve large outputs.

    Args:
        tool_names: List of tool names to inspect
        builder: Builder instance to get function configs
        max_tool_response_chars: The truncation limit (None if disabled)

    Returns:
        Dictionary mapping tool names to their LargeToolOutputRetrieverConfig instances
    """
    large_tool_output_configs = {}

    if max_tool_response_chars is not None:
        # Import here to avoid circular imports
        try:
            from nat.tool.large_output_tools.large_tool_output_retriever import LargeToolOutputRetrieverConfig
        except ImportError:
            logger.warning("LargeToolOutputRetrieverConfig not available")
            return {}

        for tool_name in tool_names:
            try:
                fn_config = builder.get_function_config(tool_name)
                if isinstance(fn_config, LargeToolOutputRetrieverConfig):
                    large_tool_output_configs[tool_name] = fn_config
                    logger.info("Detected large tool output retriever: %s with object store: %s",
                                tool_name,
                                fn_config.object_store)
            except Exception as e:
                logger.debug("Could not inspect tool %s: %s", tool_name, e)
                continue

        if large_tool_output_configs:
            logger.info("Large tool output management enabled with %d retriever(s): %s",
                        len(large_tool_output_configs),
                        list(large_tool_output_configs.keys()))
        else:
            logger.warning(
                "max_tool_response_chars is set to %d but no large_tool_output_retriever functions found. "
                "Large outputs will be truncated but not stored for retrieval.",
                max_tool_response_chars)

    return large_tool_output_configs


TOOL_NOT_FOUND_ERROR_MESSAGE = "There is no tool named {tool_name}. Tool must be one of {tools}."
INPUT_SCHEMA_MESSAGE = ". Arguments must be provided as a valid JSON object following this format: {schema}"
NO_INPUT_ERROR_MESSAGE = "No human input received to the agent, Please ask a valid question."

AGENT_LOG_PREFIX = "[AGENT]"
AGENT_CALL_LOG_MESSAGE = f"\n{'-' * 30}\n" + \
                                 AGENT_LOG_PREFIX + "\n" + \
                                 Fore.YELLOW + \
                                 "Agent input: %s\n" + \
                                 Fore.CYAN + \
                                 "Agent's thoughts: \n%s" + \
                                 Fore.RESET + \
                                 f"\n{'-' * 30}"

TOOL_CALL_LOG_MESSAGE = f"\n{'-' * 30}\n" + \
                                 AGENT_LOG_PREFIX + "\n" + \
                                 Fore.WHITE + \
                                 "Calling tools: %s\n" + \
                                 Fore.YELLOW + \
                                 "Tool's input: %s\n" + \
                                 Fore.CYAN + \
                                 "Tool's response: \n%s" + \
                                 Fore.RESET + \
                                 f"\n{'-' * 30}"


class AgentDecision(Enum):
    TOOL = "tool"
    END = "finished"


class BaseAgent(ABC):

    def __init__(self,
                 llm: BaseChatModel,
                 tools: list[BaseTool],
                 callbacks: list[AsyncCallbackHandler] | None = None,
                 detailed_logs: bool = False,
                 log_response_max_chars: int = 1000) -> None:
        logger.debug("Initializing Agent Graph")
        self.llm = llm
        self.tools = tools
        self.callbacks = callbacks or []
        self.detailed_logs = detailed_logs
        self.log_response_max_chars = log_response_max_chars
        self.graph = None

    async def _stream_llm(self,
                          runnable: Any,
                          inputs: dict[str, Any],
                          config: RunnableConfig | None = None) -> AIMessage:
        """
        Stream from LLM runnable. Retry logic is handled automatically by the underlying LLM client.

        Parameters
        ----------
        runnable : Any
            The LLM runnable (prompt | llm or similar)
        inputs : Dict[str, Any]
            The inputs to pass to the runnable
        config : RunnableConfig | None
            The config to pass to the runnable (should include callbacks)

        Returns
        -------
        AIMessage
            The LLM response
        """
        output_message = ""
        async for event in runnable.astream(inputs, config=config):
            output_message += event.content

        return AIMessage(content=output_message)

    async def _call_llm(self, messages: list[BaseMessage]) -> AIMessage:
        """
        Call the LLM directly. Retry logic is handled automatically by the underlying LLM client.

        Parameters
        ----------
        messages : list[BaseMessage]
            The messages to send to the LLM

        Returns
        -------
        AIMessage
            The LLM response
        """
        response = await self.llm.ainvoke(messages)
        return AIMessage(content=str(response.content))

    async def _call_tool(self,
                         tool: BaseTool,
                         tool_input: dict[str, Any] | str,
                         config: RunnableConfig | None = None,
                         max_retries: int = 3) -> ToolMessage:
        """
        Call a tool with retry logic and error handling.

        Parameters
        ----------
        tool : BaseTool
            The tool to call
        tool_input : Union[Dict[str, Any], str]
            The input to pass to the tool
        config : RunnableConfig | None
            The config to pass to the tool
        max_retries : int
            Maximum number of retry attempts (default: 3)

        Returns
        -------
        ToolMessage
            The tool response
        """
        last_exception = None

        for attempt in range(1, max_retries + 1):
            try:
                response = await tool.ainvoke(tool_input, config=config)

                # Handle empty responses
                if response is None or (isinstance(response, str) and response == ""):
                    return ToolMessage(name=tool.name,
                                       tool_call_id=tool.name,
                                       content=f"The tool {tool.name} provided an empty response.")

                # ToolMessage only accepts str or list[str | dict] as content.
                # Convert into list if the response is a dict.
                if isinstance(response, dict):
                    response = [response]

                return ToolMessage(name=tool.name, tool_call_id=tool.name, content=response)

            except Exception as e:
                last_exception = e

                # If this was the last attempt, don't sleep
                if attempt == max_retries:
                    break

                logger.warning("%s Tool call attempt %d/%d failed for tool %s: %s",
                               AGENT_LOG_PREFIX,
                               attempt,
                               max_retries,
                               tool.name,
                               str(e))

                # Exponential backoff: 2^attempt seconds
                sleep_time = 2**attempt
                logger.debug("%s Retrying tool call for %s in %d seconds...", AGENT_LOG_PREFIX, tool.name, sleep_time)
                await asyncio.sleep(sleep_time)

        # All retries exhausted, return error message
        error_content = "Tool call failed after all retry attempts. Last error: %s" % str(last_exception)
        logger.error("%s %s", AGENT_LOG_PREFIX, error_content, exc_info=True)
        return ToolMessage(name=tool.name, tool_call_id=tool.name, content=error_content, status="error")

    def _log_tool_response(self, tool_name: str, tool_input: Any, tool_response: str) -> None:
        """
        Log tool response with consistent formatting and length limits.

        Parameters
        ----------
        tool_name : str
            The name of the tool that was called
        tool_input : Any
            The input that was passed to the tool
        tool_response : str
            The response from the tool
        """
        if self.detailed_logs:
            # Truncate tool response if too long
            display_response = tool_response[:self.log_response_max_chars] + "...(rest of response truncated)" if len(
                tool_response) > self.log_response_max_chars else tool_response

            # Format the tool input for display
            tool_input_str = str(tool_input)

            tool_response_log_message = TOOL_CALL_LOG_MESSAGE % (tool_name, tool_input_str, display_response)
            logger.info(tool_response_log_message)

    def _parse_json(self, json_string: str) -> dict[str, Any]:
        """
        Safely parse JSON with graceful error handling.
        If JSON parsing fails, returns an empty dict or error info.

        Parameters
        ----------
        json_string : str
            The JSON string to parse

        Returns
        -------
        Dict[str, Any]
            The parsed JSON or error information
        """
        try:
            return json.loads(json_string)
        except json.JSONDecodeError as e:
            logger.warning("%s JSON parsing failed, returning the original string: %s", AGENT_LOG_PREFIX, str(e))
            return {"error": f"JSON parsing failed: {str(e)}", "original_string": json_string}
        except Exception as e:
            logger.warning("%s Unexpected error during JSON parsing: %s", AGENT_LOG_PREFIX, str(e))
            return {"error": f"Unexpected parsing error: {str(e)}", "original_string": json_string}

    def _get_chat_history(self, messages: list[BaseMessage]) -> str:
        """
        Get the chat history excluding the last message.

        Parameters
        ----------
        messages : list[BaseMessage]
            The messages to get the chat history from

        Returns
        -------
        str
            The chat history excluding the last message
        """
        return "\n".join([f"{message.type}: {message.content}" for message in messages[:-1]])

    @abstractmethod
    async def _build_graph(self, state_schema: type) -> CompiledGraph:
        """Build and return the agent graph for the given state schema."""
        pass


async def process_large_tool_outputs(tool_responses: list[BaseMessage],
                                     max_tool_response_chars: int,
                                     large_tool_output_configs: dict,
                                     builder) -> list[BaseMessage]:
    """Process and truncate large tool outputs, storing full versions if retriever configs are available."""
    if not max_tool_response_chars or not tool_responses:
        return tool_responses

    import datetime

    processed_responses = []

    # Process each tool response for potential truncation
    for tool_response in tool_responses:
        if not isinstance(tool_response, ToolMessage):
            processed_responses.append(tool_response)
            continue

        response_content = str(tool_response.content)
        content_length = len(response_content)

        # Check if truncation is needed
        if content_length > max_tool_response_chars:
            logger.info("Tool %s output (%d chars) exceeds limit (%d chars), truncating",
                        tool_response.name,
                        content_length,
                        max_tool_response_chars)

            # Truncate the content
            truncated_content = response_content[:max_tool_response_chars]

            # Default truncation notice
            truncation_notice = f"\n\n[TRUNCATED: Original output was {content_length} characters. " \
                               f"Use large_tool_output_retriever to access full content.]"

            # Store full content if retriever configs are available
            if large_tool_output_configs and builder:
                try:
                    # Generate a unique key for this tool output
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                    output_key = f"{tool_response.name}_{timestamp}.txt"

                    # Store in the first available object store (they should all be the same according to design)
                    retriever_config = next(iter(large_tool_output_configs.values()))
                    object_store = await builder.get_object_store_client(retriever_config.object_store)

                    # Create metadata (all values must be strings)
                    metadata = {
                        "tool_name": tool_response.name,
                        "tool_call_id": tool_response.tool_call_id,
                        "original_length": str(content_length),
                        "truncated_length": str(max_tool_response_chars),
                        "timestamp": timestamp
                    }

                    # Store the full content as ObjectStoreItem
                    from nat.object_store.models import ObjectStoreItem

                    item = ObjectStoreItem(data=response_content.encode('utf-8'),
                                           content_type="text/plain",
                                           metadata=metadata)
                    await object_store.upsert_object(output_key, item)
                    logger.info("Stored full tool output (%d chars) to object store with key: %s",
                                content_length,
                                output_key)

                    # Update truncation notice with the storage key
                    truncation_notice = f"\n\n[TRUNCATED: Original output was {content_length} characters. " \
                                       f"Full content stored with key: {output_key}. " \
                                       f"Use large_tool_output_retriever to access full content.]"
                except Exception as e:
                    logger.error("Failed to store large tool output: %s", e)
                    # Keep the default truncation notice

            # Create truncated tool response
            truncated_response = ToolMessage(name=tool_response.name,
                                             tool_call_id=tool_response.tool_call_id,
                                             content=truncated_content + truncation_notice)
            processed_responses.append(truncated_response)
        else:
            # No truncation needed
            processed_responses.append(tool_response)

    return processed_responses


async def process_agent_large_tool_outputs(state, config, large_tool_output_configs, builder):
    """
    Centralized processing of large tool outputs for any agent state.
    Handles different agent state structures uniformly.

    Args:
        state: Agent state object (ReActGraphState, ToolCallAgentGraphState, or ReWOOGraphState)
        config: Agent configuration with max_tool_response_chars
        large_tool_output_configs: Dictionary of retriever configurations
        builder: Builder instance for object store access

    Returns:
        Modified state with processed tool outputs
    """
    if not config.max_tool_response_chars:
        return state

    # ReAct Agent: state.tool_responses
    if hasattr(state, 'tool_responses') and state.tool_responses:
        state.tool_responses = await process_large_tool_outputs(state.tool_responses,
                                                                config.max_tool_response_chars,
                                                                large_tool_output_configs,
                                                                builder)

    # Tool Calling Agent: filter ToolMessages from state.messages
    elif hasattr(state, 'messages'):
        from langchain_core.messages import ToolMessage

        # Filter for tool messages only
        tool_messages = [msg for msg in state.messages if isinstance(msg, ToolMessage)]
        if tool_messages:
            processed_tool_messages = await process_large_tool_outputs(tool_messages,
                                                                       config.max_tool_response_chars,
                                                                       large_tool_output_configs,
                                                                       builder)

            # Replace tool messages in the state with processed versions
            new_messages = []
            tool_msg_iter = iter(processed_tool_messages)
            for msg in state.messages:
                if isinstance(msg, ToolMessage):
                    new_messages.append(next(tool_msg_iter))
                else:
                    new_messages.append(msg)
            state.messages = new_messages

    # ReWOO Agent: state.intermediate_results
    elif hasattr(state, 'intermediate_results') and state.intermediate_results:
        # Extract tool messages from intermediate_results
        tool_messages = list(state.intermediate_results.values())
        if tool_messages:
            processed_tool_messages = await process_large_tool_outputs(tool_messages,
                                                                       config.max_tool_response_chars,
                                                                       large_tool_output_configs,
                                                                       builder)

            # Replace tool messages in intermediate_results with processed versions
            keys = list(state.intermediate_results.keys())
            for i, key in enumerate(keys):
                if i < len(processed_tool_messages):
                    state.intermediate_results[key] = processed_tool_messages[i]

    return state


def setup_large_tool_output_processing(config, builder):
    """
    Set up large tool output processing by detecting retriever configurations.
    This centralizes the introspection logic used by all agent workflows.

    Args:
        config: Agent configuration with tool_names and max_tool_response_chars
        builder: Builder instance for function config access

    Returns:
        Dictionary mapping tool names to their LargeToolOutputRetrieverConfig instances
    """
    return detect_large_tool_output_configs(config.tool_names, builder, config.max_tool_response_chars)
