import { NextRequest, NextResponse } from 'next/server';

interface TableData {
  columns: string[];
  data: Record<string, string>[];
}

interface TableUpdateRequest {
  table_id: string;
  table_data: TableData;
  operation_message?: string;
}

// In-memory storage for the current table state
let currentTableState: TableUpdateRequest | null = null;

export async function POST(request: NextRequest) {
  try {
    const body: TableUpdateRequest = await request.json();
    
    // Update the current table state
    currentTableState = {
      ...body,
      operation_message: body.operation_message || `Table '${body.table_id}' updated`
    };
    
    return NextResponse.json({ 
      success: true, 
      message: 'Table updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!currentTableState) {
      return NextResponse.json({
        table_data: null,
        operation_message: 'No table created yet'
      });
    }

    return NextResponse.json(currentTableState);
  } catch (error) {
    console.error('Error getting table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get table' },
      { status: 500 }
    );
  }
}
