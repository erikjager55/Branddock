'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Clock, Type, Copy, Check } from 'lucide-react';
import { Badge, Button } from '@/components/shared';
import type { DeliverableComponentState } from '@/types/studio';

interface TextComponentEditorProps {
  component: DeliverableComponentState;
  onContentChange: (content: string) => void;
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getReadingTime(text: string): string {
  const words = getWordCount(text);
  const minutes = Math.ceil(words / 200);
  return minutes <= 1 ? '< 1 min' : `${minutes} min`;
}

export function TextComponentEditor({ component, onContentChange }: TextComponentEditorProps) {
  const [localContent, setLocalContent] = useState(component.generatedContent ?? '');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalContent(component.generatedContent ?? '');
  }, [component.id, component.generatedContent]);

  const handleBlur = () => {
    if (localContent !== component.generatedContent) {
      onContentChange(localContent);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPending = component.status === 'PENDING';
  const wordCount = getWordCount(localContent);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">{component.label}</span>
          <Badge variant={component.status === 'APPROVED' ? 'success' : 'default'} size="sm">
            {component.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {localContent && (
            <>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Type className="h-3 w-3" />
                {wordCount} words
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {getReadingTime(localContent)}
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isPending ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500 mb-1">Content not yet generated</p>
              <p className="text-xs text-gray-400">
                Click &quot;Generate&quot; in the left panel to create content for this component.
              </p>
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            className="w-full h-full min-h-[200px] resize-none border-0 focus:ring-0 text-gray-900 text-sm leading-relaxed placeholder:text-gray-400"
            placeholder="Generated content will appear here..."
            disabled={component.status === 'APPROVED'}
          />
        )}
      </div>
    </div>
  );
}
