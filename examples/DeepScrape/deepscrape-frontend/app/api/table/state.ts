interface TableData {
  columns: string[];
  data: Record<string, string>[];
}

interface TableState {
  table_id: string;
  table_data: TableData;
  operation_message?: string;
}

// In-memory storage for the current table state
let currentTableState: TableState | null = null;

export function getCurrentTableState(): TableState | null {
  return currentTableState;
}

export function updateCurrentTableState(newState: TableState): void {
  currentTableState = newState;
}

export function clearTableState(): void {
  currentTableState = null;
}
