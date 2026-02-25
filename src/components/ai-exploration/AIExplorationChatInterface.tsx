'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Bot, Cpu, User, Sparkles } from 'lucide-react';
import type { ExplorationMessage, ExplorationConfig, ExplorationModelOption } from './types';

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
  /** Available AI models (from /api/exploration/models) */
  models?: ExplorationModelOption[];
  /** Currently selected model ID */
  selectedModelId?: string;
  /** Callback to change model (restarts session, disabled after first answer) */
  onModelChange?: (modelId: string) => void;
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
  models,
  selectedModelId,
  onModelChange,
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
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        height: '100%',
      }}
    >
      {/* Model Selector */}
      {models && models.length > 1 && (
        <div className="flex items-center gap-2" style={{ padding: '8px 24px', borderBottom: '1px solid #f3f4f6', backgroundColor: 'rgba(249,250,251,0.5)' }}>
          <Cpu className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
          <select
            value={selectedModelId ?? ''}
            onChange={(e) => onModelChange?.(e.target.value)}
            disabled={answeredDimensions > 0}
            className="text-sm bg-white rounded-md outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ padding: '2px 8px', color: '#4b5563', border: '1px solid #e5e7eb' }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.description}
              </option>
            ))}
          </select>
          {answeredDimensions > 0 && (
            <span className="text-xs" style={{ color: '#9ca3af' }}>(locked for this session)</span>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-5"
        style={{
          minHeight: 0,
          padding: '24px',
          background: 'linear-gradient(to bottom right, #f8fafc, #ffffff)',
        }}
      >
        {visibleMessages.map((msg) => {
          const isUser = msg.type === 'USER_ANSWER';
          const isFeedback = msg.type === 'AI_FEEDBACK';
          const isIntro = msg.type === 'SYSTEM_INTRO';

          if (isUser) {
            return (
              <div key={msg.id} className="flex items-start gap-3 justify-end">
                <div
                  className="max-w-[75%] rounded-2xl rounded-tr-none"
                  style={{
                    padding: '14px 18px',
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

          if (isFeedback) {
            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1FD1B2, #10b981)' }}
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 max-w-[75%]">
                  <div
                    className="rounded-2xl rounded-tl-none"
                    style={{
                      padding: '14px 18px',
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
              <div className="flex-1 max-w-[75%]">
                <div
                  className="rounded-2xl rounded-tl-none"
                  style={{
                    padding: '14px 18px',
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

        {isAITyping && (
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #10b981)' }}
            >
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-tl-none"
              style={{ padding: '14px 18px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
            >
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#14b8a6', animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#14b8a6', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#14b8a6', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Section — all inside the card */}
      <div style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        {/* Progress */}
        <div style={{ padding: '16px 24px 12px' }}>
          <div className="flex items-center justify-between text-xs" style={{ marginBottom: '10px' }}>
            <span className="font-medium" style={{ color: '#6b7280' }}>Progress</span>
            <span className="font-semibold" style={{ color: '#14b8a6' }}>{progressPercent}%</span>
          </div>
          <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
            {Array.from({ length: totalDimensions }).map((_, i) => (
              <div key={i} className="flex-1">
                <div
                  className="rounded-full transition-all duration-500"
                  style={{
                    height: '6px',
                    backgroundColor: i < answeredDimensions ? '#14b8a6' : i === answeredDimensions ? '#99f6e4' : '#e5e7eb',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {config.dimensions.map((dim, i) => (
              <span key={dim.key} className="font-medium" style={{ fontSize: '10px', color: i <= answeredDimensions ? '#14b8a6' : '#9ca3af' }}>
                {dim.label}
              </span>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '0 24px 12px' }}>
          <textarea
            value={currentInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here..."
            disabled={isAITyping || isSubmitting}
            rows={3}
            className="w-full rounded-xl text-sm resize-none outline-none disabled:opacity-50 transition-all"
            style={{ padding: '14px 16px', backgroundColor: '#ffffff', color: '#111827', border: '1px solid #e5e7eb' }}
            onFocus={(e) => { e.target.style.borderColor = '#14b8a6'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Navigation — inside the card */}
        <div className="flex items-center justify-between" style={{ padding: '0 24px 16px' }}>
          <button disabled className="flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: '#6b7280' }}>
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={onSubmit}
            disabled={!currentInput.trim() || isAITyping || isSubmitting}
            className="flex items-center gap-2 text-sm font-medium rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              padding: '10px 24px',
              background: isLastDimension ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'linear-gradient(135deg, #14b8a6, #10b981)',
              boxShadow: (!currentInput.trim() || isAITyping) ? 'none' : isLastDimension ? '0 2px 8px rgba(139,92,246,0.3)' : '0 2px 8px rgba(20,184,166,0.3)',
            }}
          >
            {isLastDimension ? (<><Sparkles className="h-4 w-4" /> Generate Report</>) : (<>Next <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
