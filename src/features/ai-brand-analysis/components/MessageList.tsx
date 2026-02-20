'use client';

import React, { useEffect, useRef } from 'react';
import type { AIAnalysisMessage } from '@/types/ai-analysis';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: AIAnalysisMessage[];
  isAITyping: boolean;
}

export function MessageList({ messages, isAITyping }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const safeMessages = Array.isArray(messages) ? messages : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeMessages.length, isAITyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
      {safeMessages.map((msg) => (
        <ChatBubble key={msg.id} type={msg.type} content={msg.content} />
      ))}
      {isAITyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
