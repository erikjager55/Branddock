'use client';

import React, { useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/shared';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputArea({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Type your answer...',
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !disabled) {
          onSubmit();
        }
      }
    },
    [value, disabled, onSubmit],
  );

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 min-h-[60px] max-h-[200px] resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
        />
        <Button
          variant="cta"
          size="md"
          icon={Send}
          disabled={!value.trim() || disabled}
          onClick={onSubmit}
          className="flex-shrink-0 rounded-xl"
        >
          Send
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-gray-400 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
