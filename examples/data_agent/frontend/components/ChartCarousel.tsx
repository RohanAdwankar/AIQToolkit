import React, { useState } from "react";
import {
  BarChart as ReBarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line,
  ScatterChart as ReScatterChart, Scatter,
  PieChart as RePieChart, Pie
} from 'recharts';

// Helper to determine column types
function getColumnTypes(data: Record<string, string>[], columns: string[]) {
  if (!data || data.length === 0) return { stringColumns: [], numericColumns: [] };
  const stringColumns: string[] = [];
  const numericColumns: string[] = [];
  columns.forEach(col => {
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

function BarChartRecharts({ columns, data, axisDomain, xKey, yKey }: { columns: string[]; data: Record<string, string>[]; axisDomain?: { x?: [number, number]; y?: [number, number] }, xKey: string, yKey: string }) {
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length === 0) return null;
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
            domain={axisDomain?.x}
            type={axisDomain?.x ? 'number' : undefined}
          />
          <YAxis
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
            domain={axisDomain?.y}
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

function LineChartRecharts({ columns, data, axisDomain, xKey, yKey }: { columns: string[]; data: Record<string, string>[]; axisDomain?: { x?: [number, number]; y?: [number, number] }, xKey: string, yKey: string }) {
  const { stringColumns, numericColumns } = getColumnTypes(data, columns);
  if (stringColumns.length === 0 || numericColumns.length < 2) return null;
  const chartData = getRechartsData(data, columns);
  return (
    <div className="w-full h-[400px] flex flex-col items-center my-8">
      <h3 className="text-gray-200 text-lg font-semibold mb-2">Line Chart ({xKey} vs {yKey})</h3>
      <ResponsiveContainer width="100%" height="90%">
        <ReLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} angle={-20} textAnchor="end" interval={0} height={60}
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
            domain={axisDomain?.x}
            type={axisDomain?.x ? 'number' : undefined}
          />
          <YAxis
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
            domain={axisDomain?.y}
          />
          <Tooltip contentStyle={{ background: '#222', color: '#fff', border: 'none' }}
            itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }} cursor={{ fill: '#444', opacity: 0.2 }} />
          <Legend wrapperStyle={{ color: '#fff', fontWeight: 'bold' }} />
          <Line type="monotone" dataKey={yKey} stroke="#8884d8" activeDot={{ r: 8 }} />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ScatterChartRecharts({ columns, data, axisDomain, xKey, yKey }: { columns: string[]; data: Record<string, string>[]; axisDomain?: { x?: [number, number]; y?: [number, number] }, xKey: string, yKey: string }) {
  const { numericColumns } = getColumnTypes(data, columns);
  if (numericColumns.length < 2) return null;
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
            domain={axisDomain?.x}
          />
          <YAxis type="number" dataKey={yKey} name={yKey}
            tick={{ fill: '#fff', fontWeight: 'bold' }}
            axisLine={{ stroke: '#fff' }}
            tickLine={{ stroke: '#fff' }}
            domain={axisDomain?.y}
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

interface ChartConfig {
  name: string;
  type: 'bar' | 'line' | 'pie' | 'scatter';
  columns: string[];
  data: Record<string, string>[];
}

interface ChartCarouselProps {
  charts: ChartConfig[];
  onExportCSV?: () => void;
}

export default function ChartCarousel({ charts, onExportCSV }: ChartCarouselProps) {
  const [idx, setIdx] = useState(0);
  const n = charts.length;
  const [showAutoscale, setShowAutoscale] = useState(false);
  const [axisDomains, setAxisDomains] = useState<{ [chartIdx: number]: { x?: [number, number]; y?: [number, number] } }>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [axisDropdownOpen, setAxisDropdownOpen] = useState(false);
  // Change customAxes type to { x?: string; y?: string } for global axis persistence
  const [customAxes, setCustomAxes] = useState<{ x?: string; y?: string }>({});

  if (n === 0) return null;
  const goLeft = () => setIdx(i => (i - 1 + n) % n);
  const goRight = () => setIdx(i => (i + 1) % n);

  // Helper to get default axes based on chart type and columns
  function getDefaultAxes(chart: ChartConfig) {
    const { columns, data, type } = chart;
    const { stringColumns, numericColumns } = getColumnTypes(data, columns);
    if (type === 'bar') {
      return { x: stringColumns[0] || columns[0], y: numericColumns[0] || columns[1] };
    } else if (type === 'line') {
      return { x: stringColumns[0] || columns[0], y: numericColumns[0] || columns[1] };
    } else if (type === 'scatter') {
      return { x: numericColumns[0] || columns[0], y: numericColumns[1] || columns[1] };
    }
    return { x: columns[0], y: columns[1] };
  }

  function getNumericRange(chart: ChartConfig): { x?: [number, number]; y?: [number, number] } {
    const { columns, data, type } = chart;
    const numericCols = columns.filter((col: string) => data.every((row: any) => !isNaN(Number(row[col]))));
    if (numericCols.length === 0) return {};
    let xKey = numericCols[0], yKey = numericCols[1] || numericCols[0];
    if (type === 'scatter') {
      xKey = numericCols[0];
      yKey = numericCols[1] || numericCols[0];
    }
    const xVals = data.map((row: any) => Number(row[xKey])).filter((v: number) => !isNaN(v));
    const yVals = data.map((row: any) => Number(row[yKey])).filter((v: number) => !isNaN(v));
    if (!xVals.length || !yVals.length) return {};
    const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
    const xMid = (xMin + xMax) / 2, xRange = (xMax - xMin);
    const yMid = (yMin + yMax) / 2, yRange = (yMax - yMin);
    return {
      x: [xMid - xRange, xMid + xRange],
      y: [yMid - yRange, yMid + yRange],
    };
  }

  const handleAutoscale = () => {
    if (axisDomains[idx]) {
      // If already autoscaled, reset to default (0-based) scale
      setAxisDomains(domains => {
        const newDomains = { ...domains };
        delete newDomains[idx];
        return newDomains;
      });
      setShowAutoscale(false);
    } else {
      const autoscale = getNumericRange(charts[idx]);
      setAxisDomains(domains => ({ ...domains, [idx]: autoscale }));
      setShowAutoscale(false);
    }
  };

  const handleCustomScale = () => {
    const autoscale = getNumericRange(charts[idx]);
    setAxisDomains(domains => ({ ...domains, [idx]: autoscale }));
    setShowAutoscale(true);
    setDropdownOpen(false);
  };

  const handleAxisChange = (axis: 'x' | 'y', minOrMax: 0 | 1, value: string) => {
    setAxisDomains(domains => {
      const prev = domains[idx] || {};
      const arr = prev[axis] ? [...prev[axis]!] : [0, 0];
      arr[minOrMax] = Number(value);
      return { ...domains, [idx]: { ...prev, [axis]: arr as [number, number] } };
    });
  };

  // Handler for setting custom axes
  const handleSetAxes = (axis: 'x' | 'y', value: string) => {
    setCustomAxes(prev => ({
      ...prev,
      [axis]: value
    }));
  };

  // Handler for resetting to auto axes
  const handleAutoAxes = () => {
    setCustomAxes({}); // Reset all axes to auto
    setAxisDropdownOpen(false);
  };

  // Get axes globally (persisted for all chart types)
  const axes = {
    x: customAxes.x || getDefaultAxes(charts[idx]).x,
    y: customAxes.y || getDefaultAxes(charts[idx]).y
  };
  // Ensure axes.x and axes.y are always defined strings
  const xKey = axes.x || charts[idx].columns[0];
  const yKey = axes.y || charts[idx].columns[1] || charts[idx].columns[0];

  // Chart rendering with axes override
  let chartWithDomain: React.ReactNode = null;
  const chart = charts[idx];
  if (chart.type === 'bar') {
    chartWithDomain = <BarChartRecharts columns={chart.columns} data={chart.data} axisDomain={axisDomains[idx]} xKey={xKey} yKey={yKey} />;
  } else if (chart.type === 'line') {
    chartWithDomain = <LineChartRecharts columns={chart.columns} data={chart.data} axisDomain={axisDomains[idx]} xKey={xKey} yKey={yKey} />;
  } else if (chart.type === 'scatter') {
    chartWithDomain = <ScatterChartRecharts columns={chart.columns} data={chart.data} axisDomain={axisDomains[idx]} xKey={xKey} yKey={yKey} />;
  } else if (chart.type === 'pie') {
    chartWithDomain = <PieChartRecharts columns={chart.columns} data={chart.data} />;
  }

  return (
    <div className="w-full flex flex-col items-center my-8">
      <div className="flex items-center gap-4 mb-2">
        {/* Axis selection button group */}
        <div className="relative flex mr-2">
          <button
            onClick={handleAutoAxes}
            className="px-3 py-2 rounded-l-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow border-r border-blue-700"
            aria-label="AutoAxis"
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          >AutoAxis</button>
          <button
            onClick={() => setAxisDropdownOpen(open => !open)}
            className="px-2 py-2 rounded-r-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow flex items-center"
            aria-label="Axis options"
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.65a.75.75 0 01-1.08 0l-4.25-4.65a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
          </button>
          {axisDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg z-10 min-w-[180px] p-2">
              <div className="mb-2 text-gray-300 font-semibold">Set Axes</div>
              <div className="flex flex-col gap-2">
                <label className="text-gray-200">X Axis:
                  <select
                    className="ml-2 px-2 py-1 rounded bg-gray-700 text-gray-100 border border-gray-600"
                    value={axes.x}
                    onChange={e => handleSetAxes('x', e.target.value)}
                  >
                    {chart.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </label>
                <label className="text-gray-200">Y Axis:
                  <select
                    className="ml-2 px-2 py-1 rounded bg-gray-700 text-gray-100 border border-gray-600"
                    value={axes.y}
                    onChange={e => handleSetAxes('y', e.target.value)}
                  >
                    {chart.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                onClick={() => setAxisDropdownOpen(false)}
                className="mt-2 w-full px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-800"
              >Done</button>
            </div>
          )}
        </div>
        <div className="relative flex">
          <button
            onClick={handleAutoscale}
            className="px-3 py-2 rounded-l-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow border-r border-yellow-700"
            aria-label="AutoScale chart"
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          >AutoScale</button>
          <button
            onClick={() => setDropdownOpen(open => !open)}
            className="px-2 py-2 rounded-r-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold shadow flex items-center"
            aria-label="Autoscale options"
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.65a.75.75 0 01-1.08 0l-4.25-4.65a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg z-10 min-w-[140px]">
              <button
                onClick={handleCustomScale}
                className="block w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-700"
              >Custom</button>
            </div>
          )}
        </div>
        <button
          onClick={goLeft}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 shadow"
          aria-label="Previous chart"
        >&#8592;</button>
        <span className="text-gray-300 font-semibold text-lg">{chart.name}</span>
        <button
          onClick={goRight}
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 shadow"
          aria-label="Next chart"
        >&#8594;</button>
        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="ml-4 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow disabled:opacity-50"
            disabled={!chartWithDomain}
          >
            Export CSV
          </button>
        )}
      </div>
      {showAutoscale && axisDomains[idx] && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex flex-col gap-2 w-full max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-200 font-semibold">Adjust Axis Ranges</span>
            <button onClick={() => setShowAutoscale(false)} className="text-gray-400 hover:text-red-400">✕</button>
          </div>
          {['x', 'y'].map(axis => (
            <div key={axis} className="flex items-center gap-2">
              <span className="text-gray-300 w-8 uppercase">{axis}</span>
              <label className="text-gray-400">Min:
                <input
                  type="number"
                  className="ml-1 px-2 py-1 rounded bg-gray-700 text-gray-100 border border-gray-600 w-24"
                  value={axisDomains[idx][axis as 'x' | 'y']?.[0] ?? ''}
                  onChange={e => handleAxisChange(axis as 'x' | 'y', 0, e.target.value)}
                />
              </label>
              <label className="text-gray-400">Max:
                <input
                  type="number"
                  className="ml-1 px-2 py-1 rounded bg-gray-700 text-gray-100 border border-gray-600 w-24"
                  value={axisDomains[idx][axis as 'x' | 'y']?.[1] ?? ''}
                  onChange={e => handleAxisChange(axis as 'x' | 'y', 1, e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
      )}
      <div className="w-full flex justify-center">
        {chartWithDomain}
      </div>
    </div>
  );
}
