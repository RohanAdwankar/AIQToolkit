import React, { RefObject, useEffect, useState } from "react";

interface AIThoughtsPanelProps {
  thoughts: string[];
  isStreaming: boolean;
  thoughtsEndRef: RefObject<HTMLDivElement | null>;
  systemMessages?: { type: 'error' | 'operation'; text: string; timestamp: string }[];
}

// Helper to extract and highlight links, and render message with clickable links
function renderThoughtText(text: string) {
  // Regex to match URLs (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  // Highlight 'Agent Read <url>' and 'Agent Thought: <text>'
  const agentReadRegex = /Agent Read (https?:\/\/[^\s]+)/g;
  const agentThoughtRegex = /Agent Thought:([^\n]*)/g;

  // Highlight Agent Thought
  text = text.replace(agentThoughtRegex, (match, p1) => `[[AGENT_THOUGHT:${p1.trim()}]]`);

  // Replace Agent Read links with a marker
  text = text.replace(agentReadRegex, (match, url) => `[[AGENT_READ:${url}]]`);

  // Now split by lines and process markers
  return text.split("\n").map((line, idx) => {
    // Agent Thought
    if (line.includes('[[AGENT_THOUGHT:')) {
      const thought = line.match(/\[\[AGENT_THOUGHT:(.*)\]\]/)?.[1] || '';
      return (
        <span key={idx} className="font-semibold text-purple-300">Agent Thought: <span className="text-purple-100">{thought}</span></span>
      );
    }
    // Agent Read
    if (line.includes('[[AGENT_READ:')) {
      const url = line.match(/\[\[AGENT_READ:(.*)\]\]/)?.[1] || '';
      return (
        <span key={idx}>
          <span className="font-semibold text-blue-400">Agent Read </span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-blue-300 break-all">{url}</a>
        </span>
      );
    }
    // Otherwise, just highlight links
    return line.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-blue-300 break-all">{part}</a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  });
}

const AIThoughtsPanel: React.FC<AIThoughtsPanelProps> = ({ thoughts, isStreaming, thoughtsEndRef, systemMessages = [] }) => {
  // Store timestamps for each message, only set once per message
  const [timestamps, setTimestamps] = useState<string[]>([]);
  useEffect(() => {
    if (thoughts.length > timestamps.length) {
      const now = new Date();
      setTimestamps(prev => [
        ...prev,
        ...Array(thoughts.length - prev.length).fill(0).map((_, i) =>
          new Date(now.getTime() + i).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        )
      ]);
    } else if (thoughts.length < timestamps.length) {
      setTimestamps(prev => prev.slice(0, thoughts.length));
    }
  }, [thoughts.length]);

  return (
    <aside className="w-1/4 min-w-[280px] max-w-xs bg-gray-800 rounded-lg shadow-lg p-4 mr-6 h-[80vh] overflow-y-auto flex flex-col">
      <h2 className="text-gray-100 text-xl font-bold mb-4">AI Thoughts</h2>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {thoughts.length === 0 && systemMessages.length === 0 && !isStreaming && (
          <div className="text-gray-400 italic">No thoughts yet.</div>
        )}
        {/* System messages (error/operation) */}
        {systemMessages.map((msg, i) => (
          <div key={`sys-${i}`} className="mb-1 flex flex-col items-end">
            <div className={`rounded-2xl px-4 py-2 text-sm max-w-full shadow border font-semibold ${msg.type === 'error' ? 'bg-red-900 border-red-700 text-red-200' : 'bg-blue-900 border-blue-700 text-blue-200'}`}
            >
              {msg.type === 'error' ? 'Error: ' : 'Operation: '}
              <span className="font-normal">{msg.text}</span>
            </div>
            <span className="text-xs text-gray-400 mt-1 mr-2 text-right">{msg.timestamp}</span>
          </div>
        ))}
        {/* Agent thoughts/messages */}
        {thoughts.map((t, i) => (
          <div key={i} className="mb-1 flex flex-col items-start">
            <div className="bg-gray-700 rounded-2xl px-4 py-2 text-gray-200 text-sm whitespace-pre-wrap break-words max-w-full shadow border border-gray-600">
              {renderThoughtText(t)}
            </div>
            <span className="text-xs text-gray-400 mt-1 ml-2">{timestamps[i]}</span>
          </div>
        ))}
        <div ref={thoughtsEndRef} />
      </div>
      {isStreaming && (
        <div className="text-blue-400 mt-2 animate-pulse">Streaming thoughts...</div>
      )}
    </aside>
  );
};

export default AIThoughtsPanel;
