import React, { useState } from "react";

interface ChartCarouselProps {
  charts: { name: string; element: React.ReactNode }[];
  onExportCSV?: () => void;
}

export default function ChartCarousel({ charts, onExportCSV }: ChartCarouselProps) {
  const [idx, setIdx] = useState(0);
  const n = charts.length;
  if (n === 0) return null;
  const goLeft = () => setIdx(i => (i - 1 + n) % n);
  const goRight = () => setIdx(i => (i + 1) % n);
  return (
    <div className="w-full flex flex-col items-center my-8">
      <div className="flex items-center gap-4 mb-2">
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
        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="ml-4 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow disabled:opacity-50"
            disabled={!charts[idx].element}
          >
            Export CSV
          </button>
        )}
      </div>
      <div className="w-full flex justify-center">
        {charts[idx].element}
      </div>
    </div>
  );
}
