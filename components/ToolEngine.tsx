'use client';

import React, { useState } from 'react';

export const ToolEngine = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFormat = () => {
    try {
      if (!input.trim()) return;
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch {
      setOutput('Invalid JSON input. Please check your syntax.');
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Input JSON / Raw Text:
        </label>
        <textarea
          rows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste raw content here..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleFormat}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Format & Clean
        </button>
        <button
          onClick={() => { setInput(''); setOutput(''); }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Clear
        </button>
      </div>

      {output && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Output:</label>
            <button
              onClick={handleCopy}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <pre className="p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-sm overflow-x-auto min-h-[120px]">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};
