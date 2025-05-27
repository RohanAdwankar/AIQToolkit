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
import time

# Adding a delay for rate limiting purposes, this adds foo seconds of delay to each tool call
AGENT_DELAY = 0

# Start with an empty DataFrame
_table_storage = {"main_table": pd.DataFrame()}

class PopulateCellConfig(FunctionBaseConfig, name="populate_cell"):
    """Configuration for populate cell tool."""
    pass

class GetTableConfig(FunctionBaseConfig, name="get_table"):
    """Configuration for get table tool."""
    pass

class PopulateCellsConfig(FunctionBaseConfig, name="populate_cells"):
    """Configuration for batch cell population tool."""
    pass

class AddColumnsConfig(FunctionBaseConfig, name="add_columns"):
    """Configuration for add columns tool."""
    pass

class AddRowsConfig(FunctionBaseConfig, name="add_rows"):
    """Configuration for add rows tool."""
    pass

@register_function(config_type=AddColumnsConfig)
async def add_columns(config: AddColumnsConfig, builder: Builder):
    time.sleep(AGENT_DELAY)
    """Add columns to the table. Accepts an array of strings (column names)."""
    async def _add_columns(columns: list, table_id: str = "main_table") -> str:
        try:
            df = _table_storage.get(table_id, pd.DataFrame())
            if not isinstance(columns, list) or not all(isinstance(c, str) for c in columns):
                return "Error: columns must be an array of strings."
            if not df.empty and len(df.columns) > 0:
                return f"Error: Columns already exist: {list(df.columns)}. Cannot add more columns."
            df = pd.DataFrame(columns=columns)
            _table_storage[table_id] = df
            table_view = df.to_string(index=True, na_rep="")
            # --- Webview sync ---
            table_data = {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
            payload = {
                "table_id": table_id,
                "table_data": table_data,
                "operation_message": f"Columns set to: {columns}"
            }
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://localhost:3000/api/table", json=payload, timeout=2.0)
            except Exception:
                pass
            # --- End webview sync ---
            return f"Columns set to: {columns}\n\nCurrent table:\n{table_view}"
        except Exception as e:
            return f"Error adding columns: {str(e)}"
    yield FunctionInfo.create(single_fn=_add_columns)

@register_function(config_type=AddRowsConfig)
async def add_rows(config: AddRowsConfig, builder: Builder):
    time.sleep(AGENT_DELAY)
    """Add rows to the table. Accepts an array of arrays, each subarray must match the number of columns."""
    import json
    async def _add_rows(rows: list, table_id: str = "main_table") -> str:
        try:
            df = _table_storage.get(table_id, pd.DataFrame())
            if len(df.columns) == 0:
                return "Error: Add columns first before adding rows."
            # Defensive: If rows is a string, try to parse as JSON
            if isinstance(rows, str):
                try:
                    rows = json.loads(rows)
                except Exception:
                    return ("Error: 'rows' was provided as a string but could not be parsed as JSON. "
                            "Please provide 'rows' as a native array of arrays, e.g., [[2020, 331449281], ...], not as a string.")
            if not isinstance(rows, list) or not all(isinstance(r, list) for r in rows):
                return ("Error: 'rows' must be an array of arrays, not a string or other type. "
                        "Example: [[2020, 331449281], [2019, 328239523]]")
            n_cols = len(df.columns)
            valid_rows = [r for r in rows if len(r) == n_cols]
            invalid_rows = [r for r in rows if len(r) != n_cols]
            if invalid_rows:
                return f"Error: All rows must have {n_cols} cells. Invalid rows: {invalid_rows}"
            new_df = pd.DataFrame(valid_rows, columns=df.columns)
            df = pd.concat([df, new_df], ignore_index=True)
            _table_storage[table_id] = df
            table_view = df.to_string(index=True, na_rep="")
            # --- Webview sync ---
            table_data = {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
            payload = {
                "table_id": table_id,
                "table_data": table_data,
                "operation_message": f"Added {len(valid_rows)} rows."
            }
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://localhost:3000/api/table", json=payload, timeout=2.0)
            except Exception:
                pass
            # --- End webview sync ---
            return f"Added {len(valid_rows)} rows.\n\nCurrent table:\n{table_view}"
        except Exception as e:
            return f"Error adding rows: {str(e)}"
    yield FunctionInfo.create(single_fn=_add_rows)

@register_function(config_type=PopulateCellConfig)
async def populate_cell(config: PopulateCellConfig, builder: Builder):
    time.sleep(AGENT_DELAY)
    """Populate a specific cell in the table by row_index and column. Table must already exist."""
    async def _populate_cell(row_index: int, column: str, value: str, table_id: str = "main_table") -> str:
        try:
            df = _table_storage.get(table_id, pd.DataFrame())
            if df.empty or len(df.columns) == 0:
                return "Error: Add columns and rows before populating cells."
            if row_index >= len(df) or row_index < 0:
                return f"Error: row_index {row_index} is out of bounds. Table has {len(df)} rows (0-{len(df)-1})."
            if column not in df.columns:
                return f"Error: Column '{column}' does not exist. Available columns: {list(df.columns)}"
            df.at[row_index, column] = value
            _table_storage[table_id] = df
            table_data = {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
            payload = {
                "table_id": table_id,
                "table_data": table_data,
                "operation_message": f"Cell [{row_index}, '{column}'] updated with value: '{value}'"
            }
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://localhost:3000/api/table", json=payload, timeout=2.0)
            except Exception:
                pass
            table_view = df.to_string(index=True, na_rep="")
            return f"Cell [{row_index}, '{column}'] updated with value: '{value}'\n\nCurrent table:\n{table_view}"
        except Exception as e:
            return f"Error updating cell: {str(e)}"
    yield FunctionInfo.create(single_fn=_populate_cell)

@register_function(config_type=GetTableConfig)
async def get_table(config: GetTableConfig, builder: Builder):
    time.sleep(AGENT_DELAY)
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
    time.sleep(AGENT_DELAY)
    """Populate multiple cells in the table at once by row_index and column. Table must already exist."""
    async def _populate_cells(updates: list, table_id: str = "main_table") -> str:
        try:
            df = _table_storage.get(table_id, pd.DataFrame())
            if df.empty or len(df.columns) == 0:
                return "Error: Add columns and rows before populating cells."
            messages = []
            for update in updates:
                row_index = update.get('row_index', 0)
                column = update.get('column')
                value = update.get('value')
                if row_index is None or column is None:
                    messages.append(f"Missing row_index/column in update: {update}")
                    continue
                if row_index >= len(df) or row_index < 0:
                    messages.append(f"row_index {row_index} out of bounds.")
                    continue
                if column not in df.columns:
                    messages.append(f"Column '{column}' does not exist.")
                    continue
                df.at[row_index, column] = value
                messages.append(f"Cell [{row_index}, '{column}'] updated.")
            _table_storage[table_id] = df
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
