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
import pandas as pd
from typing import Optional, Dict, Any
import httpx

# Global table storage
_table_storage = {}

class PopulateCellConfig(FunctionBaseConfig, name="populate_cell"):
    """Configuration for populate cell tool."""
    pass

class GetTableConfig(FunctionBaseConfig, name="get_table"):
    """Configuration for get table tool."""
    pass

class PopulateCellsConfig(FunctionBaseConfig, name="populate_cells"):
    """Configuration for batch cell population tool."""
    pass

@register_function(config_type=PopulateCellConfig)
async def populate_cell(config: PopulateCellConfig, builder: Builder):
    """Populate a specific cell in the table. If the table does not exist, create it with 1 row and the given column."""
    async def _populate_cell(row: int, column: str, value: str, table_id: str = "main_table") -> str:
        try:
            # If table does not exist, create it with 1 row and the given column
            if table_id not in _table_storage:
                df = pd.DataFrame(index=range(row+1), columns=[column])
                df = df.fillna("")
                _table_storage[table_id] = df
            df = _table_storage[table_id]
            # Expand DataFrame if needed
            if row >= len(df):
                df2 = pd.DataFrame(index=range(row+1), columns=df.columns)
                df2 = df2.fillna("")
                for c in df.columns:
                    df2[c][:len(df)] = df[c]
                df = df2
                _table_storage[table_id] = df
            if column not in df.columns:
                df[column] = ""
            # Update the cell
            df.at[row, column] = value
            # Prepare data for frontend
            table_data = {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
            payload = {
                "table_id": table_id,
                "table_data": table_data,
                "operation_message": f"Cell [{row}, '{column}'] updated with value: '{value}'"
            }
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://localhost:3000/api/table", json=payload, timeout=2.0)
            except Exception:
                pass
            table_view = df.to_string(index=True, na_rep="")
            return f"Cell [{row}, '{column}'] updated with value: '{value}'\n\nCurrent table:\n{table_view}"
        except Exception as e:
            return f"Error updating cell: {str(e)}"
    yield FunctionInfo.create(single_fn=_populate_cell)

@register_function(config_type=GetTableConfig)
async def get_table(config: GetTableConfig, builder: Builder):
    """Get the current state of the table."""
    
    async def _get_table(table_id: str = "main_table") -> str:
        """
        Get the current state of the table.
        
        Args:
            table_id: Table identifier
            
        Returns:
            Current table view
        """
        try:
            if table_id not in _table_storage:
                return f"Error: Table '{table_id}' does not exist."
            
            df = _table_storage[table_id]
            table_view = df.to_string(index=True, na_rep="")
            
            # Count empty cells
            empty_cells = (df == "").sum().sum()
            total_cells = df.shape[0] * df.shape[1]
            filled_cells = total_cells - empty_cells
            
            return f"Current table '{table_id}' ({filled_cells}/{total_cells} cells filled):\n{table_view}"
            
        except Exception as e:
            return f"Error retrieving table: {str(e)}"
    
    yield FunctionInfo.create(single_fn=_get_table)

@register_function(config_type=PopulateCellsConfig)
async def populate_cells(config: PopulateCellsConfig, builder: Builder):
    """Populate multiple cells in the table at once. If the table does not exist, create it with the required shape."""
    async def _populate_cells(updates: list, table_id: str = "main_table") -> str:
        try:
            # Determine required rows and columns
            max_row = 0
            columns = set()
            for update in updates:
                row = update.get('row', 0)
                column = update.get('column')
                if column is not None:
                    columns.add(column)
                if row is not None and row > max_row:
                    max_row = row
            if table_id not in _table_storage:
                df = pd.DataFrame(index=range(max_row+1), columns=list(columns))
                df = df.fillna("")
                _table_storage[table_id] = df
            df = _table_storage[table_id]
            # Expand DataFrame if needed
            if max_row >= len(df):
                df2 = pd.DataFrame(index=range(max_row+1), columns=df.columns)
                df2 = df2.fillna("")
                for c in df.columns:
                    df2[c][:len(df)] = df[c]
                df = df2
                _table_storage[table_id] = df
            for column in columns:
                if column not in df.columns:
                    df[column] = ""
            messages = []
            for update in updates:
                row = update.get('row', 0)
                column = update.get('column')
                value = update.get('value')
                if row is None or column is None:
                    messages.append(f"Missing row/column in update: {update}")
                    continue
                if row >= len(df) or row < 0:
                    messages.append(f"Row {row} out of bounds.")
                    continue
                if column not in df.columns:
                    messages.append(f"Column '{column}' does not exist.")
                    continue
                df.at[row, column] = value
                messages.append(f"Cell [{row}, '{column}'] updated.")
            # Prepare data for frontend
            table_data = {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
            payload = {
                "table_id": table_id,
                "table_data": table_data,
                "operation_message": "Batch cell update: " + "; ".join(messages)
            }
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://localhost:3000/api/table", json=payload, timeout=2.0)
            except Exception:
                pass
            table_view = df.to_string(index=True, na_rep="")
            return f"Batch update complete.\n" + "\n".join(messages) + f"\n\nCurrent table:\n{table_view}"
        except Exception as e:
            return f"Error in batch update: {str(e)}"
    yield FunctionInfo.create(single_fn=_populate_cells)
