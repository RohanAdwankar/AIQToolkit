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

class CreateTableConfig(FunctionBaseConfig, name="create_table"):
    """Configuration for create table tool."""
    pass

class PopulateCellConfig(FunctionBaseConfig, name="populate_cell"):
    """Configuration for populate cell tool."""
    pass

class GetTableConfig(FunctionBaseConfig, name="get_table"):
    """Configuration for get table tool."""
    pass

class ExportTableConfig(FunctionBaseConfig, name="export_table"):
    """Configuration for export table tool."""
    pass

@register_function(config_type=CreateTableConfig)
async def create_table(config: CreateTableConfig, builder: Builder):
    """Create a new table with specified dimensions and column names."""
    
    async def _create_table(rows: int, columns: list, table_id: str = "main_table") -> str:
        """
        Create a new table with specified dimensions and column names.
        
        Args:
            rows: Number of rows in the table
            columns: List of column names
            table_id: Unique identifier for the table
            
        Returns:
            Status message confirming table creation
        """
        try:
            # Create empty DataFrame with specified structure
            df = pd.DataFrame(index=range(rows), columns=columns)
            df = df.fillna("") # Initialize with empty strings
            
            _table_storage[table_id] = df
            
            # Prepare data for frontend
            table_data = {
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
            payload = {
                "table_id": table_id,
                "table_data": table_data,
                "operation_message": f"Table '{table_id}' created with {rows} rows and {len(columns)} columns."
            }
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://localhost:3000/api/table", json=payload, timeout=2.0)
            except Exception as e:
                pass  # Don't fail the tool if the UI is down
            
            # Return formatted table view
            table_view = df.to_string(index=True, na_rep="")
            return f"Table '{table_id}' created successfully with {rows} rows and {len(columns)} columns.\n\nCurrent table:\n{table_view}"
            
        except Exception as e:
            return f"Error creating table: {str(e)}"
    
    yield FunctionInfo.create(single_fn=_create_table)

@register_function(config_type=PopulateCellConfig)
async def populate_cell(config: PopulateCellConfig, builder: Builder):
    """Populate a specific cell in the table."""
    
    async def _populate_cell(row: int, column: str, value: str, table_id: str = "main_table") -> str:
        """
        Populate a specific cell in the table.
        
        Args:
            row: Row index (0-based)
            column: Column name
            value: Value to insert
            table_id: Table identifier
            
        Returns:
            Updated table view
        """
        try:
            if table_id not in _table_storage:
                return f"Error: Table '{table_id}' does not exist. Create table first."
            
            df = _table_storage[table_id]
            
            if row >= len(df) or row < 0:
                return f"Error: Row {row} is out of bounds. Table has {len(df)} rows (0-{len(df)-1})."
            
            if column not in df.columns:
                return f"Error: Column '{column}' does not exist. Available columns: {list(df.columns)}"
            
            # Update the cell
            df.iloc[row, df.columns.get_loc(column)] = value
            
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
            except Exception as e:
                pass  # Don't fail the tool if the UI is down
            
            # Return updated table view
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

@register_function(config_type=ExportTableConfig)
async def export_table(config: ExportTableConfig, builder: Builder):
    """Export the table in specified format."""
    
    async def _export_table(table_id: str = "main_table", format: str = "csv") -> str:
        """
        Export the table in specified format.
        
        Args:
            table_id: Table identifier
            format: Export format (csv, json, markdown)
            
        Returns:
            Exported table data
        """
        try:
            if table_id not in _table_storage:
                return f"Error: Table '{table_id}' does not exist."
            
            df = _table_storage[table_id]
            
            if format.lower() == "csv":
                return df.to_csv(index=False)
            elif format.lower() == "json":
                return df.to_json(orient="records", indent=2)
            elif format.lower() == "markdown":
                return df.to_markdown(index=False)
            else:
                return f"Error: Unsupported format '{format}'. Use csv, json, or markdown."
                
        except Exception as e:
            return f"Error exporting table: {str(e)}"
    
    yield FunctionInfo.create(single_fn=_export_table)
