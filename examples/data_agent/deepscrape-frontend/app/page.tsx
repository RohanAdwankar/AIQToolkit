"use client";

import { useState, useEffect } from "react";

// Define interfaces for our data types
interface TableData {
  columns: string[];
  data: Record<string, string>[];
}

interface TableState {
  tableData: TableData | null;
  lastUpdate: Date | null;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  operationMessage: string | null;
}

export default function Home() {
  const [tableState, setTableState] = useState<TableState>({
    tableData: null,
    lastUpdate: null,
    status: "idle",
    error: null,
    operationMessage: null,
  });

  // Poll the backend API for table updates every 2 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchTable = async () => {
      try {
        const res = await fetch("/api/table");
        const data = await res.json();
        if (!isMounted) return;
        if (data.table_data) {
          setTableState(prev => ({
            ...prev,
            tableData: data.table_data,
            lastUpdate: new Date(),
            status: "success",
            error: null,
            operationMessage: data.operation_message || null,
          }));
        } else {
          setTableState(prev => ({
            ...prev,
            tableData: null,
            status: "idle",
            error: null,
            operationMessage: data.operation_message || null,
          }));
        }
      } catch (err) {
        setTableState(prev => ({
          ...prev,
          status: "error",
          error: "Failed to fetch table state from backend.",
        }));
      }
    };
    fetchTable();
    const interval = setInterval(fetchTable, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate progress metrics
  const progress = tableState.tableData ? (() => {
    try {
      const totalCells = tableState.tableData.data.length * tableState.tableData.columns.length;
      const filledCells = tableState.tableData.data.reduce((count, row, rowIdx) => {
        return count + tableState.tableData!.columns.filter((col, colIdx) => {
          const cellValue = String(row[col] ?? '');
          return cellValue.trim() !== "";
        }).length;
      }, 0);
      const emptyCells = totalCells - filledCells;
      const percentage = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
      return { totalCells, filledCells, emptyCells, percentage };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error calculating progress:', err, tableState.tableData);
      return { totalCells: 0, filledCells: 0, emptyCells: 0, percentage: 0 };
    }
  })() : null;

  // Format timestamp
  const formattedTime = tableState.lastUpdate
    ? tableState.lastUpdate.toLocaleTimeString()
    : '';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
      <header className="bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-100">Data Agent Live Table Viewer</h1>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              tableState.status === "success" ? 'bg-green-400' : 
              tableState.status === "error" ? 'bg-red-500' : 'bg-yellow-400'
            }`}></div>
            <span className="text-sm text-gray-300 capitalize">
              {tableState.status}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {tableState.error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {tableState.error}</span>
          </div>
        )}

        {tableState.operationMessage && (
          <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Operation:</strong>
            <span className="block sm:inline"> {tableState.operationMessage}</span>
          </div>
        )}

        {!tableState.tableData && tableState.status !== "error" && (
          <div className="bg-gray-800 rounded-lg shadow p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-300">Waiting for table creation...</p>
            <p className="text-sm text-gray-400 mt-2">
              The data agent will create and populate a table here.
            </p>
          </div>
        )}

        {tableState.tableData && progress && (
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-gray-200">Table Progress</h2>
                <span className="text-sm text-gray-400">Last updated: {formattedTime}</span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                <div 
                  className="bg-blue-500 h-4 rounded-full transition-all duration-500" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-400">
                <span>{progress.filledCells} / {progress.totalCells} cells filled</span>
                <span>{progress.percentage}% complete</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Row
                    </th>
                    {tableState.tableData?.columns.map((column, idx) => (
                      <th 
                        key={idx} 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-800">
                  {tableState.tableData?.data.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                        {rowIdx}
                      </td>
                      {tableState.tableData?.columns.map((column, colIdx) => {
                        const cellValueRaw = row[column];
                        const cellValue = String(cellValueRaw ?? '');
                        let isEmpty = false;
                        try {
                          isEmpty = cellValue.trim() === '';
                        } catch (cellErr) {
                          // eslint-disable-next-line no-console
                          console.error(`Error in .trim() for cell at row ${rowIdx}, column '${column}':`, cellErr, cellValueRaw);
                          isEmpty = false;
                        }
                        return (
                          <td 
                            key={colIdx} 
                            className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                              isEmpty ? 'bg-yellow-900 text-yellow-300 italic' : 'bg-blue-900 text-gray-100'
                            }`}
                          >
                            {isEmpty ? '(empty)' : cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Data Agent Table Visualization - Real-time agent workflow viewer</p>
      </footer>
    </div>
  );
}
