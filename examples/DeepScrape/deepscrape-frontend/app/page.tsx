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
          const cellValue = row[col];
          if (typeof cellValue !== 'string') {
            // eslint-disable-next-line no-console
            console.error(`Non-string cell value in progress calculation at row ${rowIdx}, column '${col}':`, cellValue);
          }
          return typeof cellValue === 'string' && cellValue.trim() !== "";
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
    <div className="min-h-screen bg-gray-50 flex flex-col p-4">
      <header className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🔍 DeepScrape Live Table Viewer</h1>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              tableState.status === "success" ? 'bg-green-500' : 
              tableState.status === "error" ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600 capitalize">
              {tableState.status}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {tableState.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {tableState.error}</span>
          </div>
        )}

        {tableState.operationMessage && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4" role="alert">
            <strong className="font-bold">Operation:</strong>
            <span className="block sm:inline"> {tableState.operationMessage}</span>
          </div>
        )}

        {!tableState.tableData && tableState.status !== "error" && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Waiting for table creation...</p>
            <p className="text-sm text-gray-500 mt-2">
              The DeepScrape agent will create and populate a table here.
            </p>
          </div>
        )}

        {tableState.tableData && progress && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-gray-700">Table Progress</h2>
                <span className="text-sm text-gray-500">Last updated: {formattedTime}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>{progress.filledCells} / {progress.totalCells} cells filled</span>
                <span>{progress.percentage}% complete</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Row
                    </th>
                    {tableState.tableData?.columns.map((column, idx) => (
                      <th 
                        key={idx} 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableState.tableData?.data.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rowIdx}
                      </td>
                      {tableState.tableData?.columns.map((column, colIdx) => {
                        const cellValue = row[column] || '';
                        let isEmpty = false;
                        try {
                          if (typeof cellValue !== 'string') {
                            // eslint-disable-next-line no-console
                            console.error(`Non-string cell value in table render at row ${rowIdx}, column '${column}':`, cellValue);
                          }
                          isEmpty = typeof cellValue === 'string' ? cellValue.trim() === '' : false;
                        } catch (cellErr) {
                          // eslint-disable-next-line no-console
                          console.error(`Error in .trim() for cell at row ${rowIdx}, column '${column}':`, cellErr, cellValue);
                          isEmpty = false;
                        }
                        return (
                          <td 
                            key={colIdx} 
                            className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${
                              isEmpty ? 'bg-yellow-50 text-yellow-800 italic' : 'bg-blue-50 text-gray-900'
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
        <p>DeepScrape Table Visualization - Real-time agent workflow viewer</p>
      </footer>
    </div>
  );
}
