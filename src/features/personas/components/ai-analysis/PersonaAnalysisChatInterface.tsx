'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Bot } from 'lucide-react';
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

  // Filter out AI_FEEDBACK messages — go directly to next question
  const visibleMessages = messages.filter((msg) => msg.type !== 'AI_FEEDBACK');

  return (
    <div className="flex flex-col h-full rounded-xl border border-border overflow-hidden">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 p-6 space-y-4 min-h-[300px]">
        {visibleMessages.map((msg) => {
          const isUser = msg.type === 'USER_ANSWER';

          if (isUser) {
            return (
              <div key={msg.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-border ml-11">
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm p-4 border border-border/50">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          );
        })}

        {isAITyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm p-4 border border-border/50">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: progress + input + navigation */}
      <div className="border-t border-border bg-background">
        {/* Progress */}
        <div className="px-6 pt-4 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium">Voortgang</span>
            <span className="font-semibold text-teal-600">{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 pb-3">
          <textarea
            value={currentInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type je antwoord hier..."
            disabled={isAITyping || isSubmitting}
            rows={3}
            className="w-full p-4 rounded-xl border border-border bg-white dark:bg-gray-900 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:opacity-50"
          />
        </div>

        {/* Navigation */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <button
            disabled
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Vorige
          </button>
          <button
            onClick={onSubmit}
            disabled={!currentInput.trim() || isAITyping || isSubmitting}
            className="flex items-center gap-2 text-sm font-medium rounded-lg px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLastDimension ? 'Genereer Rapport' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
