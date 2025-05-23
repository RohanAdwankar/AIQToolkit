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

// Simple bar chart component using SVG
function BarChart({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  if (!columns || columns.length < 2 || !data || data.length === 0) return null;
  // Use first column as x labels, second column as y values
  const xKey = columns[0];
  const yKey = columns[1];
  // Parse y values as numbers, filter out non-numeric
  const bars = data.map((row) => ({
    x: String(row[xKey]),
    y: Number(row[yKey]),
  })).filter(bar => !isNaN(bar.y));
  if (bars.length === 0) return null;
  const maxY = Math.max(...bars.map(b => b.y));
  const chartHeight = 200;
  const chartWidth = Math.max(320, bars.length * 60);
  const barWidth = Math.max(20, chartWidth / (bars.length * 1.5));
  return (
    <div className="w-full flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Bar Chart ({xKey} vs {yKey})</h3>
      <svg width={chartWidth} height={chartHeight} className="bg-gray-900 rounded shadow">
        {bars.map((bar, i) => {
          const barHeight = maxY > 0 ? (bar.y / maxY) * (chartHeight - 40) : 0;
          return (
            <g key={i}>
              <rect
                x={i * (barWidth + 10) + 30}
                y={chartHeight - barHeight - 20}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                rx={4}
              />
              <text
                x={i * (barWidth + 10) + 30 + barWidth / 2}
                y={chartHeight - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#d1d5db"
              >
                {bar.x}
              </text>
              {/* <text
                x={i * (barWidth + 10) + 30 + barWidth / 2}
                y={chartHeight - barHeight - 28}
                textAnchor="middle"
                fontSize="12"
                fill="#fbbf24"
              >
                {bar.y}
              </text> */}
            </g>
          );
        })}
        {/* Y axis label */}
        <text x={10} y={30} fontSize="12" fill="#d1d5db" textAnchor="start" transform={`rotate(-90 40,60)`}>{yKey}</text>
      </svg>
    </div>
  );
}

export default function Home() {
  const [tableState, setTableState] = useState<TableState>({
    tableData: null,
    lastUpdate: null,
    status: "idle",
    error: null,
    operationMessage: null,
  });
  const [userInput, setUserInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<string | null>(null);

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

  // Handle user input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    setIsSubmitting(true);
    setSubmissionResult(null);
    try {
      const resp = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_message: userInput }),
      });
      const data = await resp.json();
      if (data.value) {
        setSubmissionResult(data.value);
      } else if (data.error) {
        setSubmissionResult(`Error: ${data.error}`);
      } else {
        setSubmissionResult("Unknown response from backend.");
      }
    } catch (err) {
      setSubmissionResult("Failed to contact backend server.");
    }
    setIsSubmitting(false);
    setUserInput("");
  };

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
            <div className={`h-3 w-3 rounded-full ${tableState.status === "success" ? 'bg-green-400' :
              tableState.status === "error" ? 'bg-red-500' : 'bg-yellow-400'
              }`}></div>
            <span className="text-sm text-gray-300 capitalize">
              {tableState.status}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* --- User Input Form --- */}
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col sm:flex-row gap-2 items-center justify-center">
          <input
            type="text"
            className="flex-1 rounded bg-gray-800 border border-gray-700 text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask a question or request a chart..."
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow disabled:opacity-50"
            disabled={isSubmitting || !userInput.trim()}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>

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
          <>
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
                              className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isEmpty ? 'bg-yellow-900 text-yellow-300 italic' : 'bg-blue-900 text-gray-100'
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
            <BarChart columns={tableState.tableData.columns} data={tableState.tableData.data} />
          </>
        )}
      </main>

      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Data Agent Table Visualization - Real-time agent workflow viewer</p>
      </footer>
    </div>
  );
}
