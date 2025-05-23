"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BarChart as ReBarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line,
  ScatterChart as ReScatterChart, Scatter,
  PieChart as RePieChart, Pie, Sector,
} from 'recharts';

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

// Helper to determine column types
function getColumnTypes(data: Record<string, string>[], columns: string[]) {
  // Returns { stringColumns: string[], numericColumns: string[] }
  if (!data || data.length === 0) return { stringColumns: [], numericColumns: [] };
  const stringColumns: string[] = [];
  const numericColumns: string[] = [];
  columns.forEach(col => {
    // Check if at least half the values are numeric
    const values = data.map(row => row[col]);
    const numericCount = values.filter(v => !isNaN(Number(v)) && v !== null && v !== undefined && v !== '').length;
    if (numericCount >= data.length / 2) {
      numericColumns.push(col);
    } else {
      stringColumns.push(col);
    }
  });
  return { stringColumns, numericColumns };
}

// Helper to convert table data to recharts format
function getRechartsData(data: Record<string, string>[], columns: string[]) {
  // Returns array of objects with keys as columns, values as parsed numbers or strings
  return data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      const val = row[col];
      const num = Number(val);
      obj[col] = isNaN(num) || val === '' ? val : num;
    });
    return obj;
  });
}

function BarChartRecharts({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length === 0) return null;
  const xKey = stringColumns[0];
  const yKey = numericColumns[0];
  const chartData = getRechartsData(data, columns);
  return (
    <div className="w-full h-[400px] flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Bar Chart ({xKey} vs {yKey})</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ReBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} angle={-20} textAnchor="end" interval={0} height={60}
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <YAxis
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <Tooltip contentStyle={{ background: '#222', color: '#fff', border: 'none' }}
            itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: '#444', opacity: 0.2 }} />
          <Legend wrapperStyle={{ color: '#fff', fontWeight: 'bold' }} />
          <Bar dataKey={yKey} fill="#3b82f6" activeBar={<Rectangle fill="pink" stroke="blue" />} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineChartRecharts({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length < 2) return null;
  const xKey = stringColumns[0];
  const yKey1 = numericColumns[0];
  const yKey2 = numericColumns[1] || numericColumns[0];
  const chartData = getRechartsData(data, columns);
  return (
    <div className="w-full h-[400px] flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Line Chart ({xKey} vs {yKey1}, {yKey2})</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ReLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} angle={-20} textAnchor="end" interval={0} height={60}
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <YAxis
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <Tooltip contentStyle={{ background: '#222', color: '#fff', border: 'none' }}
            itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: '#444', opacity: 0.2 }} />
          <Legend wrapperStyle={{ color: '#fff', fontWeight: 'bold' }} />
          <Line type="monotone" dataKey={yKey1} stroke="#8884d8" activeDot={{ r: 8 }} />
          {yKey2 !== yKey1 && <Line type="monotone" dataKey={yKey2} stroke="#82ca9d" />}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScatterChartRecharts({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  const { numericColumns } = getColumnTypes(data, columns);
  if (numericColumns.length < 2) return null;
  const xKey = numericColumns[0];
  const yKey = numericColumns[1];
  const chartData = getRechartsData(data, columns);
  return (
    <div className="w-full h-[400px] flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Scatter Plot ({xKey} vs {yKey})</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ReScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey={xKey} name={xKey}
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <YAxis type="number" dataKey={yKey} name={yKey}
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
          />
          <Tooltip contentStyle={{ background: '#222', color: '#fff', border: 'none' }}
            itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: '#444', opacity: 0.2 }} />
          <Scatter name="Data" data={chartData} fill="#a78bfa" />
        </ReScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartRecharts({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length === 0) return null;
  const nameKey = stringColumns[0];
  const valueKey = numericColumns[0];
  const chartData = getRechartsData(data, columns);
  return (
    <div className="w-full h-[400px] flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Pie Chart ({nameKey} breakdown)</h3>
      <ResponsiveContainer width="100%" height="90%">
        <RePieChart>
          <Pie data={chartData} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={120} fill="#8884d8" label={{ fill: '#fff', fontWeight: 'bold' }} />
          <Tooltip contentStyle={{ background: '#222', color: '#fff', border: 'none' }}
            itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: '#444', opacity: 0.2 }} />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Carousel for charts
function ChartCarousel({ charts }: { charts: { name: string; element: React.ReactNode }[] }) {
  const [idx, setIdx] = useState(0);
  const n = charts.length;
  if (n === 0) return null;
  const goLeft = () => setIdx(i => (i - 1 + n) % n);
  const goRight = () => setIdx(i => (i + 1) % n);
  return (
    <div className="w-full flex flex-col items-center my-8">
      <div className="flex items-center gap-7 mb-2">
        <button
          onClick={goLeft}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 shadow"
          aria-label="Previous chart"
        >&#8592;</button>
        <span className="text-gray-300 font-semibold text-lg">{charts[idx].name}</span>
        <button
          onClick={goRight}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 shadow"
          aria-label="Next chart"
        >&#8594;</button>
      </div>
      <div className="w-full flex justify-center">
        {charts[idx].element}
      </div>
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
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

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
    setIsStreaming(true);
    setThoughts([]);
    try {
      const resp = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_message: userInput }),
      });
      const data = await resp.json();
      // DEBUG: Show the raw output in the sidebar for now
      if (data.raw) {
        // Split the raw output into lines for easier viewing
        setThoughts(data.raw.split(/\n|(?=intermediate_data: )/g).filter(Boolean));
      } else if (data.error) {
        setThoughts([`Error: ${data.error}\n${data.details || ''}`]);
      } else {
        setThoughts(["No output received from backend."]);
      }
    } catch (err) {
      setThoughts(["Failed to contact backend server."]);
    }
    setIsSubmitting(false);
    setIsStreaming(false);
    setUserInput("");
  };

  // Scroll to bottom of thoughts when new thoughts arrive
  useEffect(() => {
    if (thoughtsEndRef.current) {
      thoughtsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [thoughts]);

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
    <div className="min-h-screen bg-gray-900 flex flex-row items-start p-4">
      {/* Sidebar for AI thoughts */}
      <aside className="w-1/4 min-w-[280px] max-w-xs bg-gray-800 rounded-lg shadow-lg p-4 mr-6 h-[80vh] overflow-y-auto flex flex-col">
        <h2 className="text-gray-100 text-xl font-bold mb-4">AI Thoughts</h2>
        <div className="flex-1 overflow-y-auto">
          {thoughts.length === 0 && !isStreaming && (
            <div className="text-gray-400 italic">No thoughts yet.</div>
          )}
          {thoughts.map((t, i) => (
            <div key={i} className="mb-3 p-2 bg-gray-700 rounded text-gray-200 text-sm whitespace-pre-line">
              {t}
            </div>
          ))}
          <div ref={thoughtsEndRef} />
        </div>
        {isStreaming && (
          <div className="text-blue-400 mt-2 animate-pulse">Streaming thoughts...</div>
        )}
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center" style={{ minHeight: '75vh', width: '75vw', maxWidth: 1200 }}>
        <header className="bg-gray-800 rounded-lg shadow p-4 mb-6 w-full">
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
        <main className="flex-1 w-full">
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
              <ChartCarousel
                charts={[
                  { name: "Bar Chart", element: <BarChartRecharts columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                  { name: "Line Chart", element: <LineChartRecharts columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                  { name: "Pie Chart", element: <PieChartRecharts columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                  { name: "Scatter Plot", element: <ScatterChartRecharts columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                ]}
              />
            </>
          )}
        </main>
        <footer className="mt-8 text-center text-sm text-gray-500 w-full">
          <p>Data Agent Table Visualization - Real-time agent workflow viewer</p>
        </footer>
      </div>
    </div>
  );
}
