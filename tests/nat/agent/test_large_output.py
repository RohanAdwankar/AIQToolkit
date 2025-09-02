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
"""Comprehensive tests for large tool output management functionality across all agent types."""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import pytest
import yaml

from nat.agent.base import BaseAgent
from nat.agent.base import process_large_tool_outputs
from nat.agent.react_agent.register import ReActAgentWorkflowConfig
from nat.agent.rewoo_agent.register import ReWOOAgentWorkflowConfig
from nat.agent.tool_calling_agent.register import ToolCallAgentWorkflowConfig
from nat.tool.large_output_tools import LargeToolOutputRetrieverConfig


class TestLargeOutputManagement:
    """Comprehensive test suite for large tool output management across all agent types."""

    # =====================================
    # Configuration Tests
    # =====================================

    def test_max_tool_response_chars_parameter_all_agents(self):
        """Test that all agent workflow configurations support max_tool_response_chars parameter."""
        # Test ReAct Agent
        react_config = ReActAgentWorkflowConfig(llm_name="test_llm", tool_names=[], max_tool_response_chars=2000)
        assert hasattr(react_config, 'max_tool_response_chars')
        assert react_config.max_tool_response_chars == 2000

        # Test Tool Calling Agent
        tool_calling_config = ToolCallAgentWorkflowConfig(llm_name="test_llm",
                                                          tool_names=[],
                                                          max_tool_response_chars=2000)
        assert hasattr(tool_calling_config, 'max_tool_response_chars')
        assert tool_calling_config.max_tool_response_chars == 2000

        # Test ReWOO Agent
        rewoo_config = ReWOOAgentWorkflowConfig(llm_name="test_llm", tool_names=[], max_tool_response_chars=2000)
        assert hasattr(rewoo_config, 'max_tool_response_chars')
        assert rewoo_config.max_tool_response_chars == 2000

    def test_max_tool_response_chars_validation_all_agents(self):
        """Test that max_tool_response_chars validates positive integers for all agents."""
        agent_configs = [ReActAgentWorkflowConfig, ToolCallAgentWorkflowConfig, ReWOOAgentWorkflowConfig]

        for config_class in agent_configs:
            # Test positive value works
            config = config_class(llm_name="test_llm", tool_names=[], max_tool_response_chars=1000)
            assert config.max_tool_response_chars == 1000

            # Test zero fails validation
            with pytest.raises(ValueError):
                config_class(llm_name="test_llm", tool_names=[], max_tool_response_chars=0)

            # Test negative value fails validation
            with pytest.raises(ValueError):
                config_class(llm_name="test_llm", tool_names=[], max_tool_response_chars=-100)

    def test_all_agent_configs_default_to_none(self):
        """Test that all agent configs default max_tool_response_chars to None."""
        react_config = ReActAgentWorkflowConfig(llm_name="test_llm", tool_names=[])
        tool_calling_config = ToolCallAgentWorkflowConfig(llm_name="test_llm", tool_names=[])
        rewoo_config = ReWOOAgentWorkflowConfig(llm_name="test_llm", tool_names=[])

        assert react_config.max_tool_response_chars is None
        assert tool_calling_config.max_tool_response_chars is None
        assert rewoo_config.max_tool_response_chars is None

    def test_large_tool_output_retriever_config(self):
        """Test that LargeToolOutputRetrieverConfig can be created and validates correctly."""
        # Test valid config
        config = LargeToolOutputRetrieverConfig(object_store="test_store", max_chunk_size=3000)
        assert config.object_store == "test_store"
        assert config.max_chunk_size == 3000
        assert config.description is not None

        # Test validation - max_chunk_size must be positive
        with pytest.raises(ValueError):
            LargeToolOutputRetrieverConfig(object_store="test_store", max_chunk_size=0)

    # =====================================
    # Architecture Tests
    # =====================================

    def test_all_agents_inherit_from_base_agent(self):
        """Test that all agent implementations inherit from BaseAgent and processing is handled at workflow level."""
        from nat.agent.react_agent.agent import ReActAgentGraph
        from nat.agent.rewoo_agent.agent import ReWOOAgentGraph
        from nat.agent.tool_calling_agent.agent import ToolCallAgentGraph

        # Test that all agents inherit from BaseAgent (directly or indirectly)
        assert issubclass(ReActAgentGraph.__bases__[0], BaseAgent)  # ReActAgentGraph -> DualNodeAgent -> BaseAgent
        assert issubclass(ToolCallAgentGraph.__bases__[0],
                          BaseAgent)  # ToolCallAgentGraph -> DualNodeAgent -> BaseAgent
        assert issubclass(ReWOOAgentGraph, BaseAgent)  # ReWOOAgentGraph -> BaseAgent

        # Test that the processing function is available at the module level (workflow level)
        # This is the new architecture - processing happens in workflow functions, not agent methods
        assert callable(process_large_tool_outputs)

        # Test that agents have clean constructors without large output parameters
        # (This verifies the refactoring to workflow-level processing)
        import inspect

        # Check that agent constructors don't have config/builder parameters
        react_init_params = list(inspect.signature(ReActAgentGraph.__init__).parameters.keys())
        tool_calling_init_params = list(inspect.signature(ToolCallAgentGraph.__init__).parameters.keys())
        rewoo_init_params = list(inspect.signature(ReWOOAgentGraph.__init__).parameters.keys())

        # None of the agent constructors should have config or builder parameters
        assert 'config' not in react_init_params
        assert 'builder' not in react_init_params
        assert 'config' not in tool_calling_init_params
        assert 'builder' not in tool_calling_init_params
        assert 'config' not in rewoo_init_params
        assert 'builder' not in rewoo_init_params

    def test_yaml_config_format_consistency(self):
        """Test that all agent types support the same YAML configuration format."""
        yaml_config_template = {
            'llm_name': 'test_llm', 'tool_names': ['tool1', 'tool2'], 'max_tool_response_chars': 2000
        }

        # Test ReAct Agent
        react_config = ReActAgentWorkflowConfig(**yaml_config_template)
        assert react_config.max_tool_response_chars == 2000
        assert react_config.llm_name == 'test_llm'
        assert react_config.tool_names == ['tool1', 'tool2']

        # Test Tool Calling Agent
        tool_calling_config = ToolCallAgentWorkflowConfig(**yaml_config_template)
        assert tool_calling_config.max_tool_response_chars == 2000
        assert tool_calling_config.llm_name == 'test_llm'
        assert tool_calling_config.tool_names == ['tool1', 'tool2']

        # Test ReWOO Agent
        rewoo_config = ReWOOAgentWorkflowConfig(**yaml_config_template)
        assert rewoo_config.max_tool_response_chars == 2000
        assert rewoo_config.llm_name == 'test_llm'
        assert rewoo_config.tool_names == ['tool1', 'tool2']

    # =====================================
    # Core Processing Logic Tests
    # =====================================

    @pytest.mark.asyncio
    async def test_tool_output_truncation_logic(self):
        """Test that the truncation logic works correctly."""
        from langchain_core.messages.tool import ToolMessage

        # Create a large tool response
        large_content = "A" * 3000  # 3000 characters
        tool_response = ToolMessage(name="test_tool", tool_call_id="test_call", content=large_content)

        tool_responses = [tool_response]

        # Process the large tool outputs (no storage configs)
        processed_responses = await process_large_tool_outputs(
            tool_responses=tool_responses,
            max_tool_response_chars=1000,
            large_tool_output_configs={},  # No storage
            builder=None)

        # Verify truncation occurred
        processed_response = processed_responses[0]
        assert isinstance(processed_response, ToolMessage)
        assert len(processed_response.content) < 3000  # Should be truncated
        assert "TRUNCATED" in processed_response.content
        assert "3000 characters" in processed_response.content
        assert "large_tool_output_retriever" in processed_response.content

    @pytest.mark.asyncio
    async def test_tool_output_no_truncation_when_small(self):
        """Test that small outputs are not truncated."""
        from langchain_core.messages.tool import ToolMessage

        # Create a small tool response
        small_content = "Small response"
        tool_response = ToolMessage(name="test_tool", tool_call_id="test_call", content=small_content)

        tool_responses = [tool_response]

        # Process the tool outputs (no storage configs)
        processed_responses = await process_large_tool_outputs(
            tool_responses=tool_responses,
            max_tool_response_chars=1000,
            large_tool_output_configs={},  # No storage
            builder=None)

        # Verify no truncation occurred
        processed_response = processed_responses[0]
        assert isinstance(processed_response, ToolMessage)
        assert processed_response.content == small_content  # Should be unchanged
        assert "TRUNCATED" not in processed_response.content

    @pytest.mark.asyncio
    async def test_tool_output_storage_with_retriever_config(self):
        """Test that large outputs are stored when retriever configs are available."""
        from langchain_core.messages.tool import ToolMessage

        # Create mock retriever config
        mock_retriever_config = LargeToolOutputRetrieverConfig(object_store="test_store", max_chunk_size=3000)

        # Create mock object store
        mock_object_store = AsyncMock()
        mock_object_store.upsert_object = AsyncMock()

        # Create mock builder
        mock_builder = MagicMock()
        mock_builder.get_object_store_client = AsyncMock(return_value=mock_object_store)

        # Create storage configs
        large_tool_output_configs = {"large_tool_output_retriever": mock_retriever_config}

        # Create a large tool response
        large_content = "B" * 2500  # 2500 characters
        tool_response = ToolMessage(name="test_tool", tool_call_id="test_call", content=large_content)

        tool_responses = [tool_response]

        # Process the large tool outputs with storage
        processed_responses = await process_large_tool_outputs(tool_responses=tool_responses,
                                                               max_tool_response_chars=1000,
                                                               large_tool_output_configs=large_tool_output_configs,
                                                               builder=mock_builder)

        # Verify truncation occurred
        processed_response = processed_responses[0]
        assert isinstance(processed_response, ToolMessage)
        assert len(processed_response.content) < 2500  # Should be truncated
        assert "TRUNCATED" in processed_response.content
        assert "2500 characters" in processed_response.content
        assert "Full content stored with key:" in processed_response.content

        # Verify storage was called
        mock_object_store.upsert_object.assert_called_once()

        # Check the stored content and key
        call_args = mock_object_store.upsert_object.call_args
        stored_key = call_args[0][0]  # First positional argument
        stored_item = call_args[0][1]  # Second positional argument (ObjectStoreItem)

        assert stored_key.startswith("test_tool_")
        assert stored_key.endswith(".txt")

        # Verify the ObjectStoreItem content
        stored_content = stored_item.data.decode('utf-8')
        assert stored_content == large_content  # Full content should be stored

        # Verify metadata
        assert stored_item.metadata["tool_name"] == "test_tool"
        assert stored_item.metadata["original_length"] == "2500"  # Should be string now
        assert stored_item.metadata["truncated_length"] == "1000"  # Should be string now

    # =====================================
    # Integration Tests
    # =====================================

    @pytest.mark.asyncio
    async def test_yaml_config_integration(self):
        """Test that the YAML configuration format works with the large output feature."""
        from nat.runtime.loader import load_config

        # Create a minimal YAML config that demonstrates the feature
        config_data = {
            'object_stores': {
                'tool_object_store': {
                    '_type': 'in_memory'
                }
            },
            'functions': {
                'large_tool_output_retriever': {
                    '_type': 'large_tool_output_retriever', 'object_store': 'tool_object_store', 'max_chunk_size': 3000
                }
            },
            'workflow': {
                '_type': 'react_agent',
                'tool_names': ['large_tool_output_retriever'],
                'llm_name': 'test_llm',
                'max_tool_response_chars': 1000,  # Key parameter we're testing
                'verbose': True
            }
        }

        # Write config to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            yaml.dump(config_data, f)
            temp_config_path = f.name

        try:
            # Load and validate config (this tests the YAML parsing and validation)
            config = load_config(Path(temp_config_path))

            # Verify the workflow config was loaded correctly
            workflow_config = config.workflow
            assert hasattr(workflow_config, 'max_tool_response_chars')
            assert workflow_config.max_tool_response_chars == 1000

            # Verify the large_tool_output_retriever function was loaded
            retriever_config = config.functions.get('large_tool_output_retriever')
            assert retriever_config is not None
            assert retriever_config.object_store == 'tool_object_store'
            assert retriever_config.max_chunk_size == 3000

        finally:
            # Clean up
            Path(temp_config_path).unlink()

    @pytest.mark.asyncio
    async def test_integration_with_large_tool_output(self):
        """Test the complete workflow by directly testing the processing logic."""
        from langchain_core.messages.tool import ToolMessage

        from nat.object_store.in_memory_object_store import InMemoryObjectStore

        # Create test data
        large_content = "LARGE OUTPUT: " + "A" * 2980 + " END"  # 3000+ chars

        # Set up mock builder with object store
        mock_builder = MagicMock()
        object_store = InMemoryObjectStore()
        mock_builder.get_object_store_client = AsyncMock(return_value=object_store)

        # Mock function config for introspection
        retriever_config = LargeToolOutputRetrieverConfig(object_store="test_store", max_chunk_size=3000)

        def mock_get_function_config(tool_name):
            if tool_name == "large_tool_output_retriever":
                return retriever_config
            raise ValueError(f"Unknown tool: {tool_name}")

        mock_builder.get_function_config = MagicMock(side_effect=mock_get_function_config)

        # Create storage configs
        large_tool_output_configs = {"large_tool_output_retriever": retriever_config}

        # Create a large tool response
        large_response = ToolMessage(name="test_tool", tool_call_id="test_call", content=large_content)

        # Test the processing directly using the workflow-level function
        processed_responses = await process_large_tool_outputs(tool_responses=[large_response],
                                                               max_tool_response_chars=1000,
                                                               large_tool_output_configs=large_tool_output_configs,
                                                               builder=mock_builder)

        # Verify truncation occurred
        processed_response = processed_responses[0]
        assert isinstance(processed_response, ToolMessage)
        assert len(processed_response.content) <= 1200  # Should be truncated (1000 + notice)
        assert "TRUNCATED" in processed_response.content
        assert "Full content stored with key:" in processed_response.content

        # Extract storage key and verify content was stored
        content = processed_response.content
        key_start = content.find("Full content stored with key: ") + len("Full content stored with key: ")
        key_end = content.find(". ", key_start)  # Find ". " instead of just "." to avoid matching .txt
        stored_key = content[key_start:key_end]

        # Verify storage
        stored_item = await object_store.get_object(stored_key)
        stored_content = stored_item.data.decode('utf-8')
        assert stored_content == large_content

        # Test retrieval (using the actual retrieval function directly)
        from nat.tool.large_output_tools.large_tool_output_retriever import ToolOutputRetrievalInput
        from nat.tool.large_output_tools.large_tool_output_retriever import large_tool_output_retriever

        # Use async context manager to get the retriever function
        async with large_tool_output_retriever(retriever_config, mock_builder) as tool_info:
            retriever_tool = tool_info.single_fn

            # Test retrieval by key
            retrieval_input = ToolOutputRetrievalInput(tool_output_key=stored_key)
            retrieved_content = await retriever_tool(retrieval_input)

            # Verify retrieval worked
            assert "LARGE OUTPUT" in retrieved_content
            assert stored_key in retrieved_content

    # =====================================
    # Retriever API Tests
    # =====================================

    @pytest.mark.asyncio
    async def test_large_tool_output_retriever_api_examples(self):
        """Test all API patterns for the large_tool_output_retriever tool.

        Tests: list, search, paginate, get latest, get by key.
        """
        from nat.object_store.in_memory_object_store import InMemoryObjectStore
        from nat.object_store.models import ObjectStoreItem
        from nat.tool.large_output_tools.large_tool_output_retriever import LargeToolOutputRetrieverConfig
        from nat.tool.large_output_tools.large_tool_output_retriever import ToolOutputRetrievalInput
        from nat.tool.large_output_tools.large_tool_output_retriever import large_tool_output_retriever

        # Set up mock builder and object store
        builder = MagicMock()
        object_store = InMemoryObjectStore()
        builder.get_object_store_client = AsyncMock(return_value=object_store)

        # Store some test data
        test_data = ('This is a large tool output with lots of content that would exceed '
                     'the truncation limit and contains error messages.')
        item = ObjectStoreItem(data=test_data.encode('utf-8'),
                               content_type='text/plain',
                               metadata={
                                   'tool_name': 'test_tool', 'timestamp': '20240115_123456'
                               })
        await object_store.upsert_object('test_tool_20240115_123456.txt', item)

        # Create config
        config = LargeToolOutputRetrieverConfig(object_store='test_store', max_chunk_size=50)

        # Test the function with all API examples from GitHub issue
        async with large_tool_output_retriever(config, builder) as tool_info:
            retriever_fn = tool_info.single_fn

            # API Example 1: Get latest output from beginning: {}
            result1 = await retriever_fn(ToolOutputRetrievalInput())
            assert 'Tool Output:' in result1
            assert 'This is a large tool output' in result1
            assert 'To read next segment' in result1  # Should have pagination hints

            # API Example 2: Paginate through output: {"start_percent": 0.5}
            result2 = await retriever_fn(ToolOutputRetrievalInput(start_percent=0.5))
            assert 'Tool Output:' in result2
            assert 'Content (' in result2  # Should show content range
            assert 'To read previous segment' in result2  # Should have back navigation

            # API Example 3: Get specific output: {"tool_output_key": "test_tool_20240115_123456.txt"}
            result3 = await retriever_fn(ToolOutputRetrievalInput(tool_output_key='test_tool_20240115_123456.txt'))
            assert 'Tool Output:' in result3
            assert 'test_tool_20240115_123456.txt' in result3

            # API Example 4: Search across outputs: {"search_query": "test_tool"}
            result4 = await retriever_fn(ToolOutputRetrievalInput(search_query='test_tool'))
            assert 'matching' in result4 or 'Found' in result4
            assert 'test_tool_20240115_123456.txt' in result4  # Should find our test file

            # API Example 5: List all outputs: {"list_outputs": true}
            result5 = await retriever_fn(ToolOutputRetrievalInput(list_outputs=True))
            assert 'Available tool outputs:' in result5
            assert 'test_tool_20240115_123456.txt' in result5
