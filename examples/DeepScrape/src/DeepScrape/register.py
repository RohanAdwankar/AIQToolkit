# pylint: disable=unused-import
# flake8: noqa

# Import any tools which need to be automatically registered here
from DeepScrape import DeepScrape_function

from aiq.cli.register_workflow import register_function
from aiq.builder.builder import Builder
from aiq.builder.function_info import FunctionInfo
from aiq.data_models.function import FunctionBaseConfig
from pydantic import Field
import asyncio

class PresentationAgentConfig(FunctionBaseConfig, name="presentation_agent"):
    """
    Configuration for the presentation agent.
    """
    # Optionally add config fields if needed
    pass

@register_function(config_type=PresentationAgentConfig)
async def presentation_agent(config: PresentationAgentConfig, builder: Builder):
    async def _present(data: dict) -> str:
        max_retries = 5
        backoff = 2  # seconds
        for attempt in range(max_retries):
            try:
                # Format the data as a table (simple markdown for now)
                if not data or not isinstance(data, dict):
                    return "No data to present."
                headers = list(data.keys())
                rows = zip(*[data[h] if isinstance(data[h], list) else [data[h]] for h in headers])
                table = '| ' + ' | '.join(headers) + ' |\n'
                table += '| ' + ' | '.join(['---'] * len(headers)) + ' |\n'
                for row in rows:
                    table += '| ' + ' | '.join(str(cell) for cell in row) + ' |\n'
                return table
            except Exception as e:
                # Check for 429 error in exception message (common for HTTP libraries)
                if '429' in str(e) or 'rate limit' in str(e).lower():
                    await asyncio.sleep(backoff * (2 ** attempt))
                else:
                    raise
        return "Error: Rate limit exceeded. Please try again later."
    yield FunctionInfo.create(single_fn=_present)
