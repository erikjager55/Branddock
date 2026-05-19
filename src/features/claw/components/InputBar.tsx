'use client';

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Send, Paperclip, FileText, Link, Type, X } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import { useFormFillStore } from '@/stores/useFormFillStore';
import { ContextSelectorModal } from './ContextSelectorModal';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { ClawMessage, ClawAttachment, ClawToolResult } from '@/lib/claw/claw.types';
import {
  toolActivityLabel,
  THINKING_LABEL,
  PROCESSING_RESULTS_LABEL,
} from '@/lib/claw/activity-labels';
import {
  filterSlashCommands,
  readSlashQuery,
  type SlashCommand,
} from '@/lib/claw/slash-commands';

export function InputBar() {
  const {
    inputText,
    setInputText,
    isStreaming,
    contextSelection,
    attachments,
    addAttachment,
    removeAttachment,
    messages,
    addMessage,
    setIsStreaming,
    appendStreamingText,
    finalizeStreaming,
    activeConversationId,
    setPendingMutation,
    resetStreamingText,
    currentPage,
    activeEntity,
    wizardSnapshot,
    setActivityStatus,
  } = useClawStore();

  // Editable form fields the active page has registered, surfaced to the AI
  // via pageContext so it can target them with `fill_form_fields`.
  const formFillFields = useFormFillStore((s) => s.fields);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Slash-command auto-suggest ───────────────────────────
  const [slashHighlight, setSlashHighlight] = useState(0);
  // Remember the exact input the user dismissed via Escape so the menu
  // doesn't pop back until they change the input.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const slashQuery = readSlashQuery(inputText);
  const slashMatches = useMemo<SlashCommand[]>(
    () => (slashQuery !== null ? filterSlashCommands(slashQuery) : []),
    [slashQuery],
  );
  const slashMenuOpen =
    slashQuery !== null &&
    slashMatches.length > 0 &&
    dismissedFor !== inputText;

  // Keep highlight in range when the filter changes.
  useEffect(() => {
    setSlashHighlight((i) =>
      slashMatches.length === 0 ? 0 : Math.min(i, slashMatches.length - 1),
    );
  }, [slashMatches.length]);

  // Clear the "dismissed" latch whenever the input changes.
  useEffect(() => {
    if (dismissedFor !== null && dismissedFor !== inputText) {
      setDismissedFor(null);
    }
  }, [inputText, dismissedFor]);

  // Auto-resize: grow with content between min (~1 row) and max (~240px).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 240);
    el.style.height = `${next}px`;
  }, [inputText]);

  const { openBugReportForm, openFeedbackForm, openQuickContentForm } = useClawStore();

  /**
   * Send the current input. Accepts an optional override so slash-menu
   * selection can dispatch through the same pipeline without waiting for
   * React to flush setInputText first.
   */
  const handleSend = useCallback(async (override?: string) => {
    const message = (override ?? inputText).trim();
    if (!message || isStreaming) return;

    // Slash command interception
    if (message.toLowerCase() === '/bug') {
      setInputText('');
      openBugReportForm();
      return;
    }
    if (message.toLowerCase() === '/feedback') {
      setInputText('');
      // Snapshot the most recent assistant reply so the feedback stays
      // anchored to what it's actually about.
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant');
      openFeedbackForm({
        conversationId: activeConversationId,
        messageId: lastAssistant?.id ?? null,
        messageContent: lastAssistant?.content ?? null,
      });
      return;
    }
    if (message.toLowerCase() === '/quick') {
      // Open the structured Quick Content form — same UX as the TopNav
      // button. Skips the AI mini-interview in favor of explicit fields.
      setInputText('');
      openQuickContentForm();
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
    setActivityStatus(THINKING_LABEL);

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
          pageContext: {
            page: currentPage,
            ...(activeEntity && {
              entityType: activeEntity.type,
              entityId: activeEntity.id,
              entityName: activeEntity.name,
              ...(activeEntity.campaignId && { campaignId: activeEntity.campaignId }),
            }),
            ...(wizardSnapshot && { wizardSnapshot }),
            ...(formFillFields.length > 0 && {
              formFillFields: formFillFields.map(({ key, label, currentValue }) => ({
                key,
                label,
                currentValue,
                isEmpty: currentValue === null || currentValue === '',
              })),
            }),
          },
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
      // Accumulate tool_result SSE events tijdens streaming zodat de
      // afgeronde assistant-message ook de tool-output bevat. Zonder dit
      // valt clientAction-gebaseerde rendering (bv. ReviewFindingsCard
      // voor Surface D) silently terug op een lege array — text-only
      // output zonder structured card.
      const collectedToolResults: ClawToolResult[] = [];

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
            // Once text starts streaming, the thinking/reading indicator is replaced
            // by the text itself — clear the status so we don't double-render.
            setActivityStatus(null);
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

          case 'tool_use_start': {
            // Show which tool the AI is running right now
            const name = (d.toolName as string) ?? '';
            if (name) setActivityStatus(toolActivityLabel(name));
            break;
          }

          case 'tool_result': {
            // Tool finished — either another tool follows or Claude writes a reply.
            // Briefly indicate processing so there's no "dead" gap.
            setActivityStatus(PROCESSING_RESULTS_LABEL);
            // Verzamel het result-object zodat de afgeronde assistant-message
            // de tool-output bevat (en ChatArea de juiste card kan dispatchen).
            const toolCallId = (d.toolCallId as string) ?? '';
            const toolName = (d.toolName as string) ?? '';
            if (toolCallId && toolName) {
              collectedToolResults.push({
                toolCallId,
                toolName,
                result: d.result,
                isError: (d.isError as boolean | undefined) ?? false,
              });
            }
            break;
          }

          case 'mutation_proposal':
            // UX-fix 2026-05-13: gebruik enqueue ipv setPendingMutation om
            // parallel mutation-proposals (bv. canvas Step 1 fill: brief +
            // visual + content_inputs in 1 response) niet te overwriten.
            // Eerste activeert direct; volgende komen in queue, popped na
            // confirm via MutationConfirmCard.
            setActivityStatus(null);
            useClawStore.getState().enqueuePendingMutation(d as never);
            break;

          case 'done': {
            const assistantMessage: ClawMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fullText,
              createdAt: new Date().toISOString(),
              toolResults: collectedToolResults.length > 0
                ? [...collectedToolResults]
                : undefined,
            };
            finalizeStreaming(assistantMessage);
            break;
          }

          case 'error': {
            // Stream-error mid-run: in plaats van alleen console.error
            // (waar de gebruiker niets van ziet) plaatsen we een
            // assistant-message in de chat met een classificatie van de
            // fout. Specifiek voor credit-balance / rate-limit errors
            // krijgt de user direct een actionable melding i.p.v. een
            // generieke "iets ging fout". 2026-05-19.
            console.error('Chat SSE error:', d.message);
            const raw = String(d.message ?? '');
            const isCreditError = /credit balance.*too low|insufficient[\s_-]*credits|out of credits|billing.*limit/i.test(raw);
            const isRateLimit = /rate[\s_-]*limit|429|too many requests/i.test(raw);
            const isAuth = /\b401\b|unauthorized|invalid[\s_-]*api[\s_-]*key/i.test(raw);

            let userText: string;
            if (isCreditError) {
              userText =
                '**Anthropic API credits zijn op.** De AI-assistent kan niet reageren tot er credits zijn bijgevuld. ' +
                'Ga naar [console.anthropic.com](https://console.anthropic.com/settings/billing) → Plans & Billing om credits toe te voegen. ' +
                'Andere AI-flows (OpenAI / Gemini) blijven werken — alleen Anthropic-calls falen tot aanvulling.';
            } else if (isRateLimit) {
              userText =
                '**Even pauze.** De AI-assistent ontving te veel verzoeken in korte tijd. ' +
                'Wacht 30 seconden en probeer opnieuw. Als dit vaker gebeurt: rate-limit op het API-account verhogen.';
            } else if (isAuth) {
              userText =
                '**API-sleutel ongeldig.** Controleer `ANTHROPIC_API_KEY` in de environment-config. ' +
                'Tot dat is gefixt blijft de AI-assistent onbeschikbaar.';
            } else {
              const detail = raw.length > 0 ? raw.slice(0, 200) : 'onbekende fout';
              userText = `**Fout bij AI-assistent**\n\n${detail}\n\nProbeer het opnieuw. Als de fout aanhoudt, controleer de server-logs.`;
            }

            addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: userText,
              createdAt: new Date().toISOString(),
            });
            setActivityStatus(null);
            setIsStreaming(false);
            break;
          }
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
    currentPage, activeEntity, wizardSnapshot, messages,
    addMessage, setInputText, setIsStreaming, appendStreamingText, finalizeStreaming,
    setPendingMutation, resetStreamingText, openBugReportForm,
    openFeedbackForm, setActivityStatus,
  ]);

  const applySlashCommand = useCallback(
    (id: SlashCommand['id']) => {
      setSlashHighlight(0);
      setDismissedFor(null);
      // Route through handleSend so dispatch stays in one place; override
      // bypasses React batching for inputText.
      handleSend(id);
    },
    [handleSend],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Slash-menu keyboard wins when it's open.
    if (slashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashHighlight((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashHighlight((i) =>
          (i - 1 + slashMatches.length) % slashMatches.length,
        );
        return;
      }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
        e.preventDefault();
        const selected = slashMatches[slashHighlight];
        if (selected) applySlashCommand(selected.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissedFor(inputText);
        return;
      }
    }

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
      <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((att) => {
                const Icon = att.type === 'file' ? FileText : att.type === 'url' ? Link : Type;
                return (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1.5 rounded-lg bg-teal-50 border border-teal-100 text-xs text-teal-800"
                  >
                    <Icon size={12} className="text-teal-600 flex-shrink-0" />
                    <span className="max-w-[220px] truncate font-medium">{att.label}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-teal-500 hover:text-teal-700 hover:bg-teal-100 transition-colors"
                      aria-label={`Remove ${att.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Unified composition card: textarea + action row + send button */}
          <div
            className="relative group rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow focus-within:border-teal-400 focus-within:shadow-md focus-within:ring-4 focus-within:ring-teal-500/10"
          >
            {slashMenuOpen && (
              <SlashCommandMenu
                commands={slashMatches}
                highlightedIndex={slashHighlight}
                onHover={setSlashHighlight}
                onSelect={applySlashCommand}
              />
            )}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your brand, personas, campaigns..."
              rows={1}
              className="block w-full resize-none rounded-t-2xl border-0 bg-transparent px-4 pt-3 pb-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:opacity-60 leading-6"
              style={{ maxHeight: 240, minHeight: 44 }}
              disabled={isStreaming}
            />

            {/* Action row inside the card */}
            <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-0">
              <div className="flex items-center gap-0.5">
                <ActionButton icon={Paperclip} label="Context" onClick={() => setShowContextModal(true)} />
                <ActionButton icon={Type} label="Text" onClick={handleAddText} />
                <ActionButton icon={FileText} label="File" onClick={handleAddFile} />
                <ActionButton icon={Link} label="URL" onClick={handleAddUrl} />
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isStreaming}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-teal-600 text-white text-sm font-semibold shadow-sm hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Context indicator — below the card, subtle */}
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-gray-400">
            <button
              onClick={() => setShowContextModal(true)}
              className="inline-flex items-center gap-1 hover:text-teal-700 transition-colors"
            >
              <span>
                {contextSelection.modules.length} {contextSelection.modules.length === 1 ? 'source' : 'sources'} in context
              </span>
              <span className="text-teal-600 underline">Edit</span>
            </button>
            <span className="text-gray-300">Enter to send · Shift + Enter for new line</span>
          </div>
        </div>
      </div>

      {showContextModal && (
        <ContextSelectorModal onClose={() => setShowContextModal(false)} />
      )}
    </>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon: Icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      type="button"
    >
      <Icon size={13} />
      <span className="font-medium">{label}</span>
    </button>
  );
}
