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

import logging
from typing import Optional

from pydantic import BaseModel
from pydantic import Field

from nat.builder.builder import Builder
from nat.builder.function_info import FunctionInfo
from nat.cli.register_workflow import register_function
from nat.data_models.component_ref import ObjectStoreRef
from nat.data_models.function import FunctionBaseConfig

logger = logging.getLogger(__name__)


async def _list_tool_outputs(object_store) -> str:
    """List all available tool outputs."""
    try:
        # Check if the object store supports listing (not in standard interface)
        if hasattr(object_store, 'list_objects'):
            objects = await object_store.list_objects(prefix="")

            if not objects:
                return "No stored tool outputs found."

            # Filter for tool output files and format nicely
            tool_outputs = [obj for obj in objects if obj.endswith('.txt')]

            if not tool_outputs:
                return "No tool output files found."

            result = "Available tool outputs:\n\n"
            for filename in sorted(tool_outputs):
                result += f"  - {filename}\n"

            result += f"\nTotal: {len(tool_outputs)} outputs"
            return result
        else:
            return "Listing functionality not supported by this object store. Use specific keys to retrieve outputs."

    except Exception as e:
        return f"Error listing tool outputs: {str(e)}"


async def _search_tool_outputs(object_store, search_query: str) -> str:
    """Search tool outputs by content or metadata."""
    try:
        # Check if the object store supports listing
        if hasattr(object_store, 'list_objects'):
            objects = await object_store.list_objects(prefix="")

            if not objects:
                return "No stored tool outputs to search."

            # Filter for tool output files and search by filename
            tool_outputs = [obj for obj in objects if obj.endswith('.txt')]
            matching_objects = [obj for obj in tool_outputs if search_query.lower() in obj.lower()]

            if not matching_objects:
                return f"No tool outputs found matching '{search_query}'"

            result = f"Tool outputs matching '{search_query}':\n\n"
            for obj_key in matching_objects:
                result += f"  - {obj_key}\n"

            result += f"\nFound {len(matching_objects)} matching outputs"
            return result
        else:
            return "Search functionality not supported by this object store. Use specific keys to retrieve outputs."

    except Exception as e:
        return f"Error searching tool outputs: {str(e)}"


async def _retrieve_by_key(object_store, key: str, start_percent: float, max_chunk_size: int) -> str:
    """Retrieve specific tool output by key with pagination."""
    try:
        # Get the full content as ObjectStoreItem
        item = await object_store.get_object(key)
        if item is None:
            return f"Tool output not found with key: {key}"

        # Extract the content from the ObjectStoreItem
        content = item.data.decode('utf-8') if isinstance(item.data, bytes) else str(item.data)

        # Apply pagination
        return _paginate_content(content, start_percent, max_chunk_size, key)

    except Exception as e:
        return f"Error retrieving tool output '{key}': {str(e)}"


async def _retrieve_latest_output(object_store, start_percent: float, max_chunk_size: int) -> str:
    """Retrieve the most recent tool output."""
    try:
        # Check if the object store supports listing
        if hasattr(object_store, 'list_objects'):
            objects = await object_store.list_objects(prefix="")

            if not objects:
                return "No stored tool outputs found."

            # Filter for tool output files and sort by filename (which includes timestamp) to get the latest
            tool_outputs = [obj for obj in objects if obj.endswith('.txt')]
            if not tool_outputs:
                return "No tool output files found."

            latest_key = sorted(tool_outputs)[-1]

            # Get the content as ObjectStoreItem
            item = await object_store.get_object(latest_key)
            if item is None:
                return f"Could not retrieve latest tool output: {latest_key}"

            # Extract the content from the ObjectStoreItem
            content = item.data.decode('utf-8') if isinstance(item.data, bytes) else str(item.data)

            # Apply pagination
            return _paginate_content(content, start_percent, max_chunk_size, latest_key)
        else:
            return "Latest output retrieval not supported by this object store. Use specific keys to retrieve outputs."

    except Exception as e:
        return f"Error retrieving latest tool output: {str(e)}"


def _paginate_content(content: str, start_percent: float, max_chunk_size: int, key: str) -> str:
    """Apply pagination to content based on start_percent and max_chunk_size."""
    content_length = len(content)

    # Calculate start position
    start_pos = int(content_length * start_percent)

    # Extract the chunk
    end_pos = min(start_pos + max_chunk_size, content_length)
    chunk = content[start_pos:end_pos]

    # Create pagination info
    current_percent = start_pos / content_length if content_length > 0 else 0
    next_percent = end_pos / content_length if content_length > 0 else 0

    # Build response with navigation hints
    result = f"Tool Output: {key}\n"
    result += f"Content ({start_pos}-{end_pos} of {content_length} chars, {current_percent:.1%}-{next_percent:.1%}):\n"
    result += "=" * 50 + "\n"
    result += chunk
    result += "\n" + "=" * 50 + "\n"

    # Add navigation hints
    if end_pos < content_length:
        next_start = next_percent
        result += f"To read next segment, use: start_percent={next_start:.2f}\n"

    if start_pos > 0:
        prev_start = max(0, (start_pos - max_chunk_size) / content_length)
        result += f"To read previous segment, use: start_percent={prev_start:.2f}\n"

    return result


class LargeToolOutputRetrieverConfig(FunctionBaseConfig, name="large_tool_output_retriever"):
    """Configuration for large tool output retriever function."""

    object_store: ObjectStoreRef = Field(
        description="Object store where large tool outputs are saved and retrieved from.")

    max_chunk_size: int = Field(default=3000,
                                description="Maximum number of characters to return in a single retrieval. "
                                "Should typically be larger than max_tool_response_chars.",
                                gt=0)

    description: str = Field(default="Retrieve large tool outputs that were previously truncated and stored. "
                             "Can retrieve latest output, specific outputs by key, or search through stored outputs.",
                             description="Description of this function for tool calling agents.")


class ToolOutputRetrievalInput(BaseModel):
    """Input model for large tool output retriever."""

    tool_output_key: Optional[str] = Field(
        default=None,
        description="Specific tool output key to retrieve. If not provided, retrieves the most recent output. "
        "Key format is: {tool_name}_{timestamp}.txt")

    start_percent: float = Field(
        default=0.0,
        description="Starting percentage of the output to read (0.0 = beginning, 0.5 = middle, 1.0 = end). "
        "Useful for pagination through large outputs.",
        ge=0.0,
        le=1.0)

    search_query: Optional[str] = Field(
        default=None,
        description="Search query to find relevant tool outputs. If provided, searches across all stored outputs.")

    list_outputs: bool = Field(default=False, description="If True, returns a list of all available tool outputs.")


@register_function(config_type=LargeToolOutputRetrieverConfig)
async def large_tool_output_retriever(config: LargeToolOutputRetrieverConfig, builder: Builder):
    """
    Retrieve large tool outputs with flexible access patterns.

    This function provides comprehensive access to tool outputs that were truncated and stored
    due to size limitations. It supports multiple retrieval patterns as specified in the GitHub issue:

    - Get latest output from beginning: {} (no parameters)
    - Paginate through output: {"start_percent": 0.5}
    - Get specific output: {"tool_output_key": "disk_check_2024-01-15.txt"}
    - Search across outputs: {"search_query": "error"}
    - List all outputs: {"list_outputs": true}
    """

    object_store = await builder.get_object_store_client(config.object_store)

    async def _retrieve_output(input_data: ToolOutputRetrievalInput) -> str:
        """
        Main retrieval function that dispatches to appropriate handlers based on input parameters.

        Args:
            input_data: ToolOutputRetrievalInput containing retrieval parameters

        Returns:
            str: Retrieved tool output content with pagination info and navigation hints
        """

        try:
            # List all available outputs
            if input_data.list_outputs:
                return await _list_tool_outputs(object_store)

            # Search functionality
            if input_data.search_query:
                return await _search_tool_outputs(object_store, input_data.search_query)

            # Retrieve specific output by key
            if input_data.tool_output_key:
                return await _retrieve_by_key(object_store,
                                              input_data.tool_output_key,
                                              input_data.start_percent,
                                              config.max_chunk_size)

            # Default: get latest output
            return await _retrieve_latest_output(object_store, input_data.start_percent, config.max_chunk_size)

        except Exception as e:
            logger.error("Error retrieving tool output: %s", e)
            return f"Error retrieving tool output: {str(e)}"

    yield FunctionInfo.from_fn(_retrieve_output, description=config.description, input_schema=ToolOutputRetrievalInput)
