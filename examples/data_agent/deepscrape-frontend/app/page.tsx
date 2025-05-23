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

// Simple bar chart component using SVG
function BarChart({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  console.log('BarChart props:', { columns, data });
  if (!columns || columns.length < 2 || !data || data.length === 0) {
    console.warn('BarChart: Not enough columns or data');
    return null;
  }
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length === 0) {
    console.warn('BarChart: No suitable string/numeric columns', { stringColumns, numericColumns });
    return null;
  }
  const xKey = stringColumns[0];
  const yKey = numericColumns[0];
  // Parse y values as numbers, filter out non-numeric
  const bars = data.map((row) => ({
    x: String(row[xKey]),
    y: Number(row[yKey]),
  })).filter(bar => !isNaN(bar.y));
  if (bars.length === 0) {
    console.warn('BarChart: No valid bars after filtering', bars);
    return null;
  }
  const maxY = Math.max(...bars.map(b => b.y));
  const chartHeight = 200;
  const chartWidth = Math.max(800, bars.length * 60);
  const barGap = 10; // increased gap
  const barWidth = Math.max(20, (chartWidth - (bars.length - 1) * barGap) / bars.length);
  return (
    <div className="w-full flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Bar Chart ({xKey} vs {yKey})</h3>
      <svg width={chartWidth} height={chartHeight} className="bg-gray-900 rounded shadow">
        {bars.map((bar, i) => {
          const barHeight = maxY > 0 ? (bar.y / maxY) * (chartHeight - 40) : 0;
          return (
            <g key={i}>
              <rect
                x={i * (barWidth + barGap) + 30}
                y={chartHeight - barHeight - 20}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                rx={4}
              />
              <text
                x={i * (barWidth + barGap) + 30 + barWidth / 2}
                y={chartHeight - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#d1d5db"
              >
                {bar.x}
              </text>
            </g>
          );
        })}
        {/* Y axis label */}
        <text x={10} y={30} fontSize="12" fill="#d1d5db" textAnchor="start" transform={`rotate(-90 40,60)`}>{yKey}</text>
      </svg>
    </div>
  );
}

// Pie chart component using SVG
function PieChart({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  console.log('PieChart props:', { columns, data });
  if (!columns || columns.length < 2 || !data || data.length === 0) {
    console.warn('PieChart: Not enough columns or data');
    return null;
  }
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length === 0) {
    console.warn('PieChart: No suitable string/numeric columns', { stringColumns, numericColumns });
    return null;
  }
  const labelKey = stringColumns[0];
  const valueKey = numericColumns[0];
  const values = data.map(row => ({
    label: String(row[labelKey]),
    value: Number(row[valueKey]),
  })).filter(d => !isNaN(d.value) && d.value > 0);
  if (values.length === 0) {
    console.warn('PieChart: No valid values after filtering', values);
    return null;
  }
  const total = values.reduce((sum, d) => sum + d.value, 0);
  const radius = 100;
  const cx = 150, cy = 120;
  let cumulative = 0;
  const colors = ["#3b82f6", "#f59e42", "#10b981", "#f43f5e", "#a78bfa", "#fbbf24", "#6366f1", "#14b8a6", "#eab308", "#ef4444"];
  function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    const start = {
      x: x + radius * Math.cos((Math.PI / 180) * startAngle),
      y: y + radius * Math.sin((Math.PI / 180) * startAngle),
    };
    const end = {
      x: x + radius * Math.cos((Math.PI / 180) * endAngle),
      y: y + radius * Math.sin((Math.PI / 180) * endAngle),
    };
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${x} ${y}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
  }
  let startAngle = 0;
  const slices = values.map((d, i) => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const path = describeArc(cx, cy, radius, startAngle, endAngle);
    const midAngle = startAngle + angle / 2;
    const labelX = cx + (radius + 30) * Math.cos((Math.PI / 180) * midAngle);
    const labelY = cy + (radius + 30) * Math.sin((Math.PI / 180) * midAngle);
    const color = colors[i % colors.length];
    const slice = { path, color, label: d.label, value: d.value, labelX, labelY };
    startAngle = endAngle;
    return slice;
  });
  return (
    <div className="w-full flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Pie Chart ({labelKey} breakdown)</h3>
      <svg width={340} height={260} className="bg-gray-900 rounded shadow">
        {slices.map((slice, i) => (
          <g key={i}>
            <path d={slice.path} fill={slice.color} stroke="#222" strokeWidth={1} />
            <text x={slice.labelX} y={slice.labelY} fontSize="12" fill="#d1d5db" textAnchor="middle">
              {slice.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Broken Y Axis Bar Chart (shows bars with a break if value is much higher than others)
function BrokenYAxisBarChart({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  console.log('BrokenYAxisBarChart props:', { columns, data });
  if (!columns || columns.length < 2 || !data || data.length === 0) {
    console.warn('BrokenYAxisBarChart: Not enough columns or data');
    return null;
  }
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length === 0) {
    console.warn('BrokenYAxisBarChart: No suitable string/numeric columns', { stringColumns, numericColumns });
    return null;
  }
  const xKey = stringColumns[0];
  const yKey = numericColumns[0];
  const bars = data.map((row) => ({
    x: String(row[xKey]),
    y: Number(row[yKey]),
  })).filter(bar => !isNaN(bar.y));
  if (bars.length === 0) {
    console.warn('BrokenYAxisBarChart: No valid bars after filtering', bars);
    return null;
  }
  // Find outliers (e.g., 2x the median)
  const ys = bars.map(b => b.y).sort((a, b) => a - b);
  const median = ys[Math.floor(ys.length / 2)];
  const threshold = median * 2;
  const chartHeight = 200;
  const chartWidth = Math.max(600, bars.length * 60);
  const barWidth = Math.max(20, chartWidth / (bars.length * 1.5));
  const maxY = Math.max(...bars.map(b => b.y));
  const breakHeight = 30;
  return (
    <div className="w-full flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Broken Y Axis Bar Chart ({xKey} vs {yKey})</h3>
      <svg width={chartWidth} height={chartHeight + breakHeight} className="bg-gray-900 rounded shadow">
        {bars.map((bar, i) => {
          let barHeight = 0;
          let yOffset = 0;
          if (bar.y > threshold) {
            barHeight = ((threshold / maxY) * (chartHeight - 40)) + breakHeight;
            yOffset = breakHeight;
          } else {
            barHeight = (bar.y / maxY) * (chartHeight - 40);
            yOffset = 0;
          }
          return (
            <g key={i}>
              <rect
                x={i * (barWidth + 10) + 30}
                y={chartHeight - barHeight - 20 + yOffset}
                width={barWidth}
                height={barHeight}
                fill="#f59e42"
                rx={4}
              />
              <text
                x={i * (barWidth + 10) + 30 + barWidth / 2}
                y={chartHeight + breakHeight - 5}
                textAnchor="middle"
                fontSize="12"
                fill="#d1d5db"
              >
                {bar.x}
              </text>
              {bar.y > threshold && (
                <text
                  x={i * (barWidth + 10) + 30 + barWidth / 2}
                  y={chartHeight - barHeight - 28 + yOffset}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#fbbf24"
                >
                  {bar.y}
                </text>
              )}
            </g>
          );
        })}
        {/* Y axis label */}
        <text x={10} y={30} fontSize="12" fill="#d1d5db" textAnchor="start" transform={`rotate(-90 40,60)`}>{yKey}</text>
        {/* Break indicator */}
        <rect x={20} y={chartHeight - 20} width={chartWidth - 40} height={breakHeight} fill="#222" opacity={0.2} />
      </svg>
    </div>
  );
}

// Scatter plot component using SVG
function ScatterPlot({ columns, data }: { columns: string[]; data: Record<string, string>[] }) {
  console.log('ScatterPlot props:', { columns, data });
  if (!columns || columns.length < 2 || !data || data.length === 0) {
    console.warn('ScatterPlot: Not enough columns or data');
    return null;
  }
  const { numericColumns } = getColumnTypes(data, columns);
  if (numericColumns.length < 2) {
    console.warn('ScatterPlot: Not enough numeric columns', { numericColumns });
    return null;
  }
  const xKey = numericColumns[0];
  const yKey = numericColumns[1];
  const points = data.map(row => ({
    x: Number(row[xKey]),
    y: Number(row[yKey]),
  })).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));
  if (points.length === 0) {
    console.warn('ScatterPlot: No valid points after filtering', points);
    return null;
  }
  const chartWidth = 340;
  const chartHeight = 220;
  const padding = 40;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  function scaleX(x: number) {
    return padding + ((x - minX) / (maxX - minX || 1)) * (chartWidth - 2 * padding);
  }
  function scaleY(y: number) {
    return chartHeight - padding - ((y - minY) / (maxY - minY || 1)) * (chartHeight - 2 * padding);
  }
  return (
    <div className="w-full flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Scatter Plot ({xKey} vs {yKey})</h3>
      <svg width={chartWidth} height={chartHeight} className="bg-gray-900 rounded shadow">
        {/* Axes */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#d1d5db" strokeWidth={2} />
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#d1d5db" strokeWidth={2} />
        {/* Points */}
        {points.map((pt, i) => (
          <circle key={i} cx={scaleX(pt.x)} cy={scaleY(pt.y)} r={7} fill="#a78bfa" opacity={0.8} />
        ))}
        {/* X/Y axis labels */}
        <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="13" fill="#d1d5db">{xKey}</text>
        <text x={20} y={chartHeight / 2} textAnchor="middle" fontSize="13" fill="#d1d5db" transform={`rotate(-90 20,${chartHeight / 2})`}>{yKey}</text>
      </svg>
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
  // Debug: log which chart is being rendered and its element
  console.log('ChartCarousel: rendering', charts[idx].name, charts[idx].element);
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
        {/* Debug: log chart element rendering */}
        {(() => { console.log('Rendering chart element:', charts[idx].element); return charts[idx].element; })()}
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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4">
      <div className="w-full flex flex-col items-center" style={{ minHeight: '75vh', width: '75vw', maxWidth: 1200 }}>
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
                  { name: "Bar Chart", element: <BarChart columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                  { name: "Pie Chart", element: <PieChart columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                  { name: "Broken Y Axis Bar Chart", element: <BrokenYAxisBarChart columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
                  { name: "Scatter Plot", element: <ScatterPlot columns={tableState.tableData.columns} data={tableState.tableData.data} /> },
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
