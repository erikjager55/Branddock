'use client';

import { useEffect, useRef } from 'react';
import { Bot, ChevronLeft, ChevronRight, User } from 'lucide-react';
import type { AnalysisMessage } from '../../types/persona-analysis.types';

const TOTAL_DIMENSIONS = 4;

interface PersonaAnalysisChatInterfaceProps {
  messages: AnalysisMessage[];
  isAITyping: boolean;
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  progress: number;
  answeredDimensions: number;
}

export function PersonaAnalysisChatInterface({
  messages,
  isAITyping,
  currentInput,
  onInputChange,
  onSubmit,
  isSubmitting,
  progress,
  answeredDimensions,
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

  const isLastDimension = answeredDimensions >= TOTAL_DIMENSIONS - 1;
  const progressPercent = Math.min(Math.round(progress), 100);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 py-4">
        {messages.map((msg) => {
          const isUser = msg.type === 'USER_ANSWER';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end gap-2">
                <div className="max-w-[75%] bg-emerald-500 text-white rounded-xl p-4">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="max-w-[75%] bg-white border border-border rounded-xl p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {isAITyping && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="py-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3 pt-2">
        <textarea
          value={currentInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type je antwoord hier..."
          disabled={isAITyping || isSubmitting}
          rows={3}
          className="w-full border border-border rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none disabled:opacity-50"
        />

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            disabled
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={onSubmit}
            disabled={!currentInput.trim() || isAITyping || isSubmitting}
            className="bg-emerald-500 text-white text-sm font-medium rounded-lg px-6 py-2 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLastDimension ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
