'use client';

import { Check, Lightbulb, Loader2 } from 'lucide-react';
import { OptimizedImage } from '@/components/shared';
import type { ChatMessage } from '../../types/persona-chat.types';
import type { PersonaWithMeta } from '../../types/persona.types';

interface PersonaChatBubbleProps {
  message: ChatMessage;
  persona: PersonaWithMeta;
  isStreaming?: boolean;
  onGenerateInsight?: (messageId: string) => void;
  isGeneratingInsight?: boolean;
  hasInsight?: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function PersonaChatBubble({
  message,
  persona,
  isStreaming,
  onGenerateInsight,
  isGeneratingInsight,
  hasInsight,
}: PersonaChatBubbleProps) {
  const isUser = message.role === 'USER';

  const initials = persona.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const timestamp = formatTime(message.createdAt);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="bg-teal-500 text-white rounded-2xl rounded-tr-sm p-4">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-gray-400">{timestamp}</span>
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={`msg-${message.id}`} className="flex items-start gap-2 group">
      <OptimizedImage
        src={persona.avatarUrl}
        alt={persona.name}
        avatar="sm"
        className="flex-shrink-0"
        fallback={
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {initials}
          </div>
        }
      />
      <div className="max-w-[80%]">
        <div className="bg-gray-50 rounded-2xl rounded-tl-sm p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{timestamp}</span>
          {!isStreaming && <Check className="w-3 h-3 text-emerald-500" />}

          {/* Insight button — only on real, non-streaming assistant messages */}
          {onGenerateInsight && message.id !== 'welcome' && !isStreaming && (
            <button
              onClick={() => onGenerateInsight(message.id)}
              disabled={isGeneratingInsight || hasInsight}
              className={`ml-1 transition-all ${
                hasInsight
                  ? 'text-amber-500 cursor-default'
                  : isGeneratingInsight
                    ? 'text-gray-400 cursor-wait'
                    : 'text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 cursor-pointer'
              }`}
              title={
                hasInsight
                  ? 'Insight saved'
                  : isGeneratingInsight
                    ? 'Generating insight...'
                    : 'Extract insight'
              }
            >
              {isGeneratingInsight ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lightbulb className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
