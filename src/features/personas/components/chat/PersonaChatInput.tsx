'use client';

import { useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface PersonaChatInputProps {
  onSend: (content: string) => void;
  onStop?: () => void;
  isDisabled: boolean;
  isStreaming?: boolean;
  personaName: string;
}

export function PersonaChatInput({
  onSend,
  onStop,
  isDisabled,
  isStreaming,
  personaName,
}: PersonaChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled || isStreaming) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Ask ${personaName.split(' ')[0]} a question...`}
        disabled={isDisabled || isStreaming}
        className="flex-1 text-sm outline-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {isStreaming ? (
        <button
          onClick={onStop}
          className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Stop generating"
        >
          <Square className="w-3 h-3 fill-current" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!value.trim() || isDisabled}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
