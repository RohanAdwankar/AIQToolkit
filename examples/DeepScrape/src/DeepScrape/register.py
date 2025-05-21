# pylint: disable=unused-import
# flake8: noqa

# Import any tools which need to be automatically registered here
from DeepScrape import DeepScrape_function

from aiq.cli.register_workflow import register_function
from aiq.builder.builder import Builder
from aiq.builder.function_info import FunctionInfo
from aiq.data_models.function import FunctionBaseConfig
from pydantic import Field

class PresentationAgentConfig(FunctionBaseConfig, name="presentation_agent"):
    """
    Configuration for the presentation agent.
    """
    # Optionally add config fields if needed
    pass

@register_function(config_type=PresentationAgentConfig)
async def presentation_agent(config: PresentationAgentConfig, builder: Builder):
    async def _present(data: dict) -> str:
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
    yield FunctionInfo.create(single_fn=_present)
