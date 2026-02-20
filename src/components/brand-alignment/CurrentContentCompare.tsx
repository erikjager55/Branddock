import React from 'react';

interface CurrentContentCompareProps {
  source: { label: string; content: string };
  target: { label: string; content: string };
}

export function CurrentContentCompare({ source, target }: CurrentContentCompareProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-500 mb-2">{source.label}</p>
        <p className="text-sm text-gray-700">{source.content}</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-500 mb-2">{target.label}</p>
        <p className="text-sm text-gray-700">{target.content}</p>
      </div>
    </div>
  );
}
