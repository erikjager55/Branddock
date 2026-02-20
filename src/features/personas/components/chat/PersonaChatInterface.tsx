'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Info, ClipboardList, X } from 'lucide-react';
import type { PersonaWithMeta } from '../../types/persona.types';
import type { UsePersonaChatReturn } from '../../hooks/usePersonaChat';
import { PersonaChatBubble } from './PersonaChatBubble';
import { PersonaChatInput } from './PersonaChatInput';
import { AIErrorCard } from '@/components/ui/AIErrorCard';

interface PersonaChatInterfaceProps {
  persona: PersonaWithMeta;
  chat: UsePersonaChatReturn;
  onOpenContextSelector?: () => void;
}

export function PersonaChatInterface({
  persona,
  chat,
  onOpenContextSelector,
}: PersonaChatInterfaceProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    error,
    messageCount,
    maxMessages,
    isNearLimit,
    sessionId,
    sendMessage,
    stopStreaming,
    retryLastMessage,
    isRetrying,
    selectedContext,
    removeContext,
    generateInsight,
    isGeneratingInsight,
    messageIdsWithInsights,
  } = chat;

  const isAtLimit = messageCount >= maxMessages;

  // Auto-scroll on new messages or streaming content
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Detect if the last message is a streaming assistant message
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const showTypingIndicator =
    isStreaming && (!lastMsg || lastMsg.role !== 'ASSISTANT' || lastMsg.content === '');

  return (
    <div className="flex flex-col h-full">
      {/* Message limit warning */}
      {isNearLimit && !isAtLimit && (
        <div className="flex items-center gap-2 px-6 py-1.5 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-700">
            {maxMessages - messageCount} messages remaining in this session
          </span>
        </div>
      )}
      {isAtLimit && (
        <div className="flex items-center gap-2 px-6 py-1.5 bg-red-50 border-b border-red-200">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-700">
            Message limit reached ({maxMessages}). Please start a new session.
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-6">
          <AIErrorCard
            message={error}
            onRetry={retryLastMessage}
            isRetrying={isRetrying}
          />
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 px-6 py-4">
        {/* Welcome message from persona */}
        {messages.length === 0 && !isStreaming && (
          <PersonaChatBubble
            message={{
              id: 'welcome',
              role: 'ASSISTANT',
              content: `Hi! I'm ${persona.name.split(' ')[0]}. ${persona.tagline || "I'm here to help you understand your target audience better."}  Feel free to ask me anything about my work and challenges!`,
              createdAt: new Date().toISOString(),
            }}
            persona={persona}
          />
        )}
        {messages.map((msg, idx) => {
          const isMsgStreaming =
            isStreaming && idx === messages.length - 1 && msg.role === 'ASSISTANT';
          // Skip empty streaming messages (typing indicator shows instead)
          if (isMsgStreaming && msg.content === '') return null;
          return (
            <PersonaChatBubble
              key={msg.id}
              message={msg}
              persona={persona}
              isStreaming={isMsgStreaming}
              onGenerateInsight={
                msg.role === 'ASSISTANT' && !isMsgStreaming ? generateInsight : undefined
              }
              isGeneratingInsight={isGeneratingInsight === msg.id}
              hasInsight={messageIdsWithInsights.has(msg.id)}
            />
          );
        })}

        {/* Typing indicator (shows before first token arrives) */}
        {showTypingIndicator && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {persona.name.split(' ')[0]} is typing...
            </span>
          </div>
        )}
      </div>

      {/* Footer: context chips + disclaimer + Add Context + input */}
      <div className="border-t border-gray-100 px-6 py-4 space-y-3">
        {/* Context chips */}
        {selectedContext.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedContext.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-teal-50 text-teal-700 rounded-full"
              >
                {item.sourceName}
                <button
                  onClick={() => removeContext(item.id)}
                  className="text-teal-500 hover:text-teal-700 transition-colors"
                  aria-label={`Remove ${item.sourceName}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Disclaimer + Add Context */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              AI-simulated conversation in Free Chat mode
            </p>
          </div>
          {onOpenContextSelector && (
            <button
              onClick={onOpenContextSelector}
              disabled={!sessionId}
              className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Add Context
            </button>
          )}
        </div>

        {/* Input */}
        <PersonaChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isDisabled={!sessionId || isAtLimit}
          isStreaming={isStreaming}
          personaName={persona.name}
        />
      </div>
    </div>
  );
}
