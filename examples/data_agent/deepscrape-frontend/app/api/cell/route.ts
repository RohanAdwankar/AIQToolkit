import { NextRequest, NextResponse } from 'next/server';

interface CellUpdateRequest {
  table_id: string;
  row: number;
  column: string;
  value: string;
}

// Import the current table state from the table route
// We'll need to create a shared state management solution
import { getCurrentTableState, updateCurrentTableState } from '../table/state';

export async function POST(request: NextRequest) {
  try {
    const body: CellUpdateRequest = await request.json();
    
    // Get current table state
    const currentState = getCurrentTableState();
    
    if (!currentState || !currentState.table_data) {
      return NextResponse.json(
        { success: false, error: 'No table exists to update' },
        { status: 400 }
      );
    }

    // Validate the cell update request
    if (body.row >= currentState.table_data.data.length || body.row < 0) {
      return NextResponse.json(
        { success: false, error: `Row ${body.row} is out of bounds` },
        { status: 400 }
      );
    }

    if (!currentState.table_data.columns.includes(body.column)) {
      return NextResponse.json(
        { success: false, error: `Column '${body.column}' does not exist` },
        { status: 400 }
      );
    }

    // Update the cell
    currentState.table_data.data[body.row][body.column] = body.value;
    currentState.operation_message = `Cell [${body.row}, '${body.column}'] updated with: '${body.value}'`;
    
    // Update the state
    updateCurrentTableState(currentState);
    
    return NextResponse.json({ 
      success: true, 
      message: `Cell updated successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating cell:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cell' },
      { status: 500 }
    );
  }
}
