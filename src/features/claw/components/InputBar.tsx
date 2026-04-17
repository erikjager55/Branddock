'use client';

import React, { useRef, useCallback, useState } from 'react';
import { Send, Paperclip, FileText, Link, Type } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { ContextSelectorModal } from './ContextSelectorModal';
import type { ClawMessage, ClawAttachment } from '@/lib/claw/claw.types';

export function InputBar() {
  const {
    inputText,
    setInputText,
    isStreaming,
    contextSelection,
    attachments,
    addAttachment,
    removeAttachment,
    addMessage,
    setIsStreaming,
    appendStreamingText,
    finalizeStreaming,
    activeConversationId,
    setPendingMutation,
    resetStreamingText,
  } = useClawStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { openBugReportForm, openBugLogbook } = useClawStore();

  const handleSend = useCallback(async () => {
    const message = inputText.trim();
    if (!message || isStreaming) return;

    // Slash command interception
    if (message.toLowerCase() === '/bug') {
      setInputText('');
      openBugReportForm();
      return;
    }
    if (message.toLowerCase() === '/bugs') {
      setInputText('');
      openBugLogbook();
      return;
    }

    // Add user message to store
    const userMessage: ClawMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);
    setInputText('');
    setIsStreaming(true);
    resetStreamingText();

    // Abort previous request if any
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/claw/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message,
          contextSelection,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errorBody = await res.text().catch(() => '');
        console.error('Brand Assistant API error:', res.status, errorBody);
        throw new Error(`Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let convId = activeConversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch {
              // Ignore malformed JSON
            }
            eventType = '';
          }
        }
      }

      function handleSSEEvent(type: string, data: unknown) {
        const d = data as Record<string, unknown>;

        switch (type) {
          case 'text_delta':
            fullText += (d.text as string) ?? '';
            appendStreamingText((d.text as string) ?? '');
            break;

          case 'conversation_meta':
            if (d.conversationId && !convId) {
              convId = d.conversationId as string;
              // Set conversation ID without clearing messages (they're already in store)
              useClawStore.setState({ activeConversationId: convId });
            }
            // Update title in sidebar when it arrives
            if (d.title && convId) {
              const { conversations, setConversations } = useClawStore.getState();
              const existing = conversations.find((c) => c.id === convId);
              if (existing && !existing.title) {
                setConversations(
                  conversations.map((c) =>
                    c.id === convId ? { ...c, title: d.title as string } : c
                  )
                );
              } else if (!existing) {
                // New conversation — add to sidebar
                setConversations([
                  {
                    id: convId!,
                    title: (d.title as string) || null,
                    messageCount: 1,
                    lastMessageAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                  },
                  ...conversations,
                ]);
              }
            }
            break;

          case 'mutation_proposal':
            setPendingMutation(d as never);
            break;

          case 'tool_use_start':
          case 'tool_result':
            // Tool results are embedded in the final assistant message
            break;

          case 'done': {
            const assistantMessage: ClawMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fullText,
              createdAt: new Date().toISOString(),
            };
            finalizeStreaming(assistantMessage);
            break;
          }

          case 'error':
            console.error('Chat SSE error:', d.message);
            setIsStreaming(false);
            break;
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Chat error:', err);
      }
      setIsStreaming(false);
    }
  }, [
    inputText, isStreaming, attachments, activeConversationId, contextSelection,
    addMessage, setInputText, setIsStreaming, appendStreamingText, finalizeStreaming,
    setPendingMutation, resetStreamingText, openBugReportForm, openBugLogbook,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddText = () => {
    const text = window.prompt('Paste text to include as context:');
    if (!text?.trim()) return;
    const att: ClawAttachment = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'Pasted text',
      content: text.trim(),
    };
    addAttachment(att);
  };

  const handleAddUrl = async () => {
    const url = window.prompt('Enter URL to scrape:');
    if (!url?.trim()) return;

    // Placeholder while scraping
    const id = crypto.randomUUID();
    const placeholder: ClawAttachment = {
      id,
      type: 'url',
      label: `Scraping ${url.trim()}...`,
      content: '',
      sourceUrl: url.trim(),
    };
    addAttachment(placeholder);

    try {
      const res = await fetch('/api/claw/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error('Scrape failed');
      const data = await res.json();

      // Replace placeholder with real content
      removeAttachment(id);
      addAttachment({
        id,
        type: 'url',
        label: data.title || url.trim(),
        content: data.content,
        sourceUrl: url.trim(),
      });
    } catch {
      removeAttachment(id);
    }
  };

  const handleAddFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt,.md,.csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const id = crypto.randomUUID();
      // Placeholder while parsing
      addAttachment({
        id,
        type: 'file',
        label: `Parsing ${file.name}...`,
        content: '',
        fileMeta: { name: file.name, size: file.size, mimeType: file.type },
      });

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/claw/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();

        removeAttachment(id);
        addAttachment({
          id,
          type: 'file',
          label: file.name,
          content: data.content,
          fileMeta: { name: file.name, size: file.size, mimeType: file.type },
        });
      } catch {
        removeAttachment(id);
      }
    };
    input.click();
  };

  return (
    <>
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600"
                >
                  {att.type === 'file' ? '📁' : att.type === 'url' ? '🔗' : '📄'}
                  <span className="max-w-[200px] truncate">{att.label}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-gray-400 hover:text-gray-600 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Context indicator */}
          <div className="flex items-center gap-1 mb-2 text-xs text-gray-400">
            <span>Context: {contextSelection.modules.length} sources</span>
            <button
              onClick={() => setShowContextModal(true)}
              className="text-teal-600 hover:text-teal-700 underline"
            >
              Edit
            </button>
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                style={{ maxHeight: 200 }}
                disabled={isStreaming}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isStreaming}
              className="h-11 w-11 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => setShowContextModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Paperclip size={14} />
              Context
            </button>
            <button
              onClick={handleAddText}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Type size={14} />
              Text
            </button>
            <button
              onClick={handleAddFile}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <FileText size={14} />
              File
            </button>
            <button
              onClick={handleAddUrl}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Link size={14} />
              URL
            </button>
          </div>
        </div>
      </div>

      {showContextModal && (
        <ContextSelectorModal onClose={() => setShowContextModal(false)} />
      )}
    </>
  );
}
