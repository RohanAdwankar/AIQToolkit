import React, { RefObject } from "react";

interface AIThoughtsPanelProps {
  thoughts: string[];
  isStreaming: boolean;
  thoughtsEndRef: RefObject<HTMLDivElement | null>;
}

const AIThoughtsPanel: React.FC<AIThoughtsPanelProps> = ({ thoughts, isStreaming, thoughtsEndRef }) => (
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
);

export default AIThoughtsPanel;
