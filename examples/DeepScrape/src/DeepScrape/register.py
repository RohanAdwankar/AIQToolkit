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
