'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Bot, User, Sparkles } from 'lucide-react';
import type { ExplorationMessage, ExplorationConfig } from './types';

interface AIExplorationChatInterfaceProps {
  config: ExplorationConfig;
  messages: ExplorationMessage[];
  isAITyping: boolean;
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  progress: number;
  answeredDimensions: number;
}

export function AIExplorationChatInterface({
  config,
  messages,
  isAITyping,
  currentInput,
  onInputChange,
  onSubmit,
  isSubmitting,
  progress,
  answeredDimensions,
}: AIExplorationChatInterfaceProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const totalDimensions = config.dimensions.length;

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

  const isLastDimension = answeredDimensions >= totalDimensions - 1;
  const progressPercent = Math.min(Math.round(progress), 100);
  const visibleMessages = (messages ?? []).filter((msg) => msg.type !== 'AI_FEEDBACK');

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}
    >
      {/* Messages Area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-6 space-y-5"
        style={{
          minHeight: 300,
          background: 'linear-gradient(to bottom right, #f8fafc, #ffffff)',
        }}
      >
        {visibleMessages.map((msg) => {
          const isUser = msg.type === 'USER_ANSWER';
          const isFeedback = msg.type === 'AI_FEEDBACK';
          const isIntro = msg.type === 'SYSTEM_INTRO';

          // User message — right aligned with gradient
          if (isUser) {
            return (
              <div key={msg.id} className="flex items-start gap-3 justify-end">
                <div
                  className="max-w-[80%] rounded-2xl rounded-tr-none p-4"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#f3f4f6' }}
                >
                  <User className="h-4 w-4" style={{ color: '#6b7280' }} />
                </div>
              </div>
            );
          }

          // AI feedback — sparkle reaction bubble
          if (isFeedback) {
            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1FD1B2, #10b981)',
                  }}
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div
                    className="rounded-2xl rounded-tl-none p-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(31,209,178,0.08), rgba(16,185,129,0.04))',
                      border: '1px solid rgba(31,209,178,0.25)',
                      color: '#374151',
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          }

          // AI question / system intro — teal bot bubble
          return (
            <div key={msg.id} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #10b981)',
                  boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
                }}
              >
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 max-w-[80%]">
                <div
                  className="rounded-2xl rounded-tl-none p-4"
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    color: '#111827',
                  }}
                >
                  <p className={`text-sm whitespace-pre-wrap ${isIntro ? 'italic' : ''}`} style={{ color: isIntro ? '#6b7280' : '#111827' }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isAITyping && (
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #10b981)',
              }}
            >
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-tl-none p-4"
              style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div className="flex gap-1.5 items-center">
                <div
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#14b8a6', animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#14b8a6', animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#14b8a6', animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        {/* Progress Bar with Step Dots */}
        <div className="px-6 pt-4 pb-3">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-medium" style={{ color: '#6b7280' }}>Voortgang</span>
            <span className="font-semibold" style={{ color: '#14b8a6' }}>{progressPercent}%</span>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: totalDimensions }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: i < answeredDimensions
                      ? '#14b8a6'
                      : i === answeredDimensions
                        ? '#5eead4'
                        : '#e5e7eb',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Dimension labels */}
          <div className="flex items-center justify-between">
            {config.dimensions.map((dim, i) => (
              <span
                key={dim.key}
                className="text-[10px] font-medium"
                style={{
                  color: i <= answeredDimensions ? '#14b8a6' : '#9ca3af',
                }}
              >
                {dim.label}
              </span>
            ))}
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
            className="w-full p-4 rounded-xl text-sm resize-none outline-none disabled:opacity-50 transition-all"
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#14b8a6';
              e.target.style.boxShadow = '0 0 0 3px rgba(20, 184, 166, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Navigation */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <button
            disabled
            className="flex items-center gap-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: '#6b7280' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Vorige
          </button>
          <button
            onClick={onSubmit}
            disabled={!currentInput.trim() || isAITyping || isSubmitting}
            className="flex items-center gap-2 text-sm font-medium rounded-lg px-6 py-2.5 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: isLastDimension
                ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                : 'linear-gradient(135deg, #14b8a6, #10b981)',
              boxShadow: !currentInput.trim() || isAITyping
                ? 'none'
                : isLastDimension
                  ? '0 2px 8px rgba(139, 92, 246, 0.3)'
                  : '0 2px 8px rgba(20, 184, 166, 0.3)',
            }}
          >
            {isLastDimension ? (
              <>
                <Sparkles className="h-4 w-4" />
                Genereer Rapport
              </>
            ) : (
              <>
                Volgende
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
