'use client';

import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import type { AnalysisMessage } from '../../types/persona-analysis.types';

interface PersonaAnalysisChatInterfaceProps {
  messages: AnalysisMessage[];
  isAITyping: boolean;
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function PersonaAnalysisChatInterface({
  messages,
  isAITyping,
  currentInput,
  onInputChange,
  onSubmit,
  isSubmitting,
}: PersonaAnalysisChatInterfaceProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isAITyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.map((msg) => {
          const isUser = msg.type === 'USER_ANSWER';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[75%] bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg rounded-tr-none px-4 py-2.5">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="max-w-[75%] bg-gray-50 border border-gray-200 rounded-lg rounded-tl-none px-4 py-2.5">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {isAITyping && (
          <div className="flex items-center gap-2 px-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <textarea
          value={currentInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share your insights about this dimension..."
          disabled={isAITyping || isSubmitting}
          rows={2}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none disabled:opacity-50"
        />
        <button
          onClick={onSubmit}
          disabled={!currentInput.trim() || isAITyping || isSubmitting}
          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
