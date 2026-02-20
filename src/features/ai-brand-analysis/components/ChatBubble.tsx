'use client';

import React from 'react';
import { Building2, Sparkles } from 'lucide-react';
import type { AIMessageType } from '@/types/ai-analysis';

interface ChatBubbleProps {
  type: AIMessageType;
  content: string;
}

export function ChatBubble({ type, content }: ChatBubbleProps) {
  if (type === 'USER_ANSWER') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] px-4 py-3 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-none shadow-sm">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  const isSystemIntro = type === 'SYSTEM_INTRO';
  const isFeedback = type === 'AI_FEEDBACK';

  const Icon = isFeedback ? Sparkles : Building2;
  const bgColor = isFeedback ? 'bg-emerald-50' : 'bg-gray-50';
  const borderColor = isFeedback ? 'border-emerald-200' : 'border-gray-200';
  const iconBg = isFeedback ? 'bg-emerald-100' : 'bg-emerald-100';
  const iconColor = isFeedback ? 'text-emerald-600' : 'text-emerald-600';

  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className={`max-w-[80%] px-4 py-3 ${bgColor} border ${borderColor} rounded-2xl rounded-tl-none shadow-sm`}>
        <p className={`text-sm whitespace-pre-wrap text-gray-700 ${isSystemIntro ? 'italic' : ''}`}>
          {content}
        </p>
      </div>
    </div>
  );
}
