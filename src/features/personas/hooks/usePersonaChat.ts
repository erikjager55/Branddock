'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { ChatMessage, ChatInsight } from '../types/persona-chat.types';
import type { ContextItem } from '../stores/usePersonaChatStore';
import * as chatApi from '../api/persona-chat.api';
import {
  useStartChatSession,
  useSessionContext,
  useRemoveContext,
  useSaveContext,
  useChatInsights,
  useGenerateInsight,
  useDeleteInsight,
} from './index';
import { getReadableErrorMessage } from '@/lib/ai/error-handler';

const MAX_MESSAGES = 50;
const WARNING_THRESHOLD = 45;

export interface UsePersonaChatReturn {
  // Messages
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  isRetrying: boolean;

  // Session
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  startNewSession: () => void;
  stopStreaming: () => void;
  retryLastMessage: () => void;

  // Context
  selectedContext: ContextItem[];
  addContext: (items: Array<{ sourceType: string; sourceId: string }>) => void;
  removeContext: (id: string) => void;

  // Insights
  insights: ChatInsight[];
  generateInsight: (messageId: string) => Promise<void>;
  deleteInsight: (insightId: string) => void;
  isGeneratingInsight: string | null;
  messageIdsWithInsights: Set<string>;

  // Limits
  messageCount: number;
  maxMessages: number;
  isNearLimit: boolean;
}

export function usePersonaChat(
  personaId: string,
  isOpen: boolean,
): UsePersonaChatReturn {
  // ─── Session state ────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Message state ────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const abortRef = useRef(false);
  const streamingMsgIdRef = useRef<string | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);

  // ─── Context state ────────────────────────────────────────
  const [selectedContext, setSelectedContext] = useState<ContextItem[]>([]);

  // ─── Insight state ────────────────────────────────────────
  const [generatingInsightForMessageId, setGeneratingInsightForMessageId] = useState<string | null>(null);

  // ─── Hooks from index.ts ──────────────────────────────────
  const startSession = useStartChatSession(personaId);
  const { data: contextData } = useSessionContext(personaId, sessionId);
  const removeContextMutation = useRemoveContext(personaId, sessionId);
  const saveContextMutation = useSaveContext(personaId, sessionId);
  const generateInsightMutation = useGenerateInsight(personaId, sessionId);
  const deleteInsightMutation = useDeleteInsight(personaId, sessionId);
  const { data: insightsData } = useChatInsights(personaId, sessionId);

  // ─── Auto-start session when modal opens ──────────────────
  useEffect(() => {
    if (isOpen) {
      setSessionId(null);
      setMessages([]);
      setError(null);
      setSelectedContext([]);
      setGeneratingInsightForMessageId(null);
      setIsLoading(true);
      startSession.mutateAsync('FREE_CHAT').then((data) => {
        setSessionId(data.sessionId);
        setIsLoading(false);
      }).catch(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, personaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync context items from server data ──────────────────
  useEffect(() => {
    if (contextData?.items) {
      setSelectedContext(
        contextData.items.map((i) => ({
          id: i.id,
          sourceType: i.sourceType,
          sourceId: i.sourceId,
          sourceName: i.sourceName,
        })),
      );
    }
  }, [contextData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Compute insights data ────────────────────────────────
  const insights = insightsData?.insights ?? [];

  const messageIdsWithInsights = useMemo(() => {
    const ids = insights
      .map((i) => i.messageId)
      .filter((id): id is string => !!id);
    return new Set(ids);
  }, [insights]);

  // ─── Message limits ───────────────────────────────────────
  const userMessageCount = messages.filter((m) => m.role === 'USER').length;
  const isNearLimit = userMessageCount >= WARNING_THRESHOLD;

  // ─── Send message ─────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || isStreaming) return;
      if (messages.length >= MAX_MESSAGES) {
        setError('Maximum messages per session reached (50). Please start a new session.');
        return;
      }

      setError(null);
      abortRef.current = false;
      lastUserMessageRef.current = content;

      const userMsg: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
      };

      const streamingId = `streaming-${Date.now()}`;
      streamingMsgIdRef.current = streamingId;
      const streamingMsg: ChatMessage = {
        id: streamingId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, streamingMsg]);
      setIsStreaming(true);

      try {
        await chatApi.streamChatMessage(personaId, sessionId, content, {
          onToken: (token) => {
            if (abortRef.current) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId ? { ...m, content: m.content + token } : m,
              ),
            );
          },
          onDone: (fullText, usage) => {
            if (abortRef.current) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? {
                      ...m,
                      content: fullText,
                      promptTokens: usage.promptTokens,
                      completionTokens: usage.completionTokens,
                    }
                  : m,
              ),
            );
          },
          onMeta: (meta) => {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === streamingId) {
                  return { ...m, id: meta.messageId };
                }
                if (m.id === userMsg.id) {
                  return { ...m, id: meta.userMessageId };
                }
                return m;
              }),
            );
            streamingMsgIdRef.current = null;
          },
          onError: (errMsg) => {
            setError(errMsg);
            setMessages((prev) => prev.filter((m) => m.id !== streamingId));
          },
        });
      } catch (err) {
        setError(getReadableErrorMessage(err));
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
      } finally {
        setIsStreaming(false);
        streamingMsgIdRef.current = null;
      }
    },
    [personaId, sessionId, isStreaming, messages.length],
  );

  // ─── Stop streaming ───────────────────────────────────────
  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
    streamingMsgIdRef.current = null;
  }, []);

  // ─── Retry last message ───────────────────────────────────
  const retryLastMessage = useCallback(() => {
    const lastMsg = lastUserMessageRef.current;
    if (!lastMsg || isStreaming) return;
    setIsRetrying(true);
    setError(null);
    sendMessage(lastMsg).finally(() => setIsRetrying(false));
  }, [isStreaming, sendMessage]);

  // ─── Start new session ────────────────────────────────────
  const startNewSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setError(null);
    setSelectedContext([]);
    setGeneratingInsightForMessageId(null);
    setIsLoading(true);
    startSession.mutateAsync('FREE_CHAT').then((data) => {
      setSessionId(data.sessionId);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [startSession]);

  // ─── Context management ───────────────────────────────────
  const addContext = useCallback(
    (items: Array<{ sourceType: string; sourceId: string }>) => {
      if (!sessionId) return;
      saveContextMutation.mutateAsync(items).catch(() => {
        // Error handled by mutation
      });
    },
    [sessionId, saveContextMutation],
  );

  const removeContext = useCallback(
    (contextId: string) => {
      removeContextMutation.mutateAsync(contextId).then(() => {
        setSelectedContext((prev) => prev.filter((i) => i.id !== contextId));
      }).catch(() => {
        // Error handled by mutation
      });
    },
    [removeContextMutation],
  );

  // ─── Insight management ───────────────────────────────────
  const handleGenerateInsight = useCallback(
    async (messageId: string) => {
      if (generatingInsightForMessageId) return;
      setGeneratingInsightForMessageId(messageId);

      try {
        await generateInsightMutation.mutateAsync(messageId);
        toast.success('Insight saved!');
      } catch {
        toast.error('Failed to generate insight');
      } finally {
        setGeneratingInsightForMessageId(null);
      }
    },
    [generatingInsightForMessageId, generateInsightMutation],
  );

  const handleDeleteInsight = useCallback(
    (insightId: string) => {
      deleteInsightMutation.mutate(insightId);
    },
    [deleteInsightMutation],
  );

  return {
    // Messages
    messages,
    isLoading,
    isStreaming,
    error,
    isRetrying,

    // Session
    sessionId,
    sendMessage,
    startNewSession,
    stopStreaming,
    retryLastMessage,

    // Context
    selectedContext,
    addContext,
    removeContext,

    // Insights
    insights,
    generateInsight: handleGenerateInsight,
    deleteInsight: handleDeleteInsight,
    isGeneratingInsight: generatingInsightForMessageId,
    messageIdsWithInsights,

    // Limits
    messageCount: messages.length,
    maxMessages: MAX_MESSAGES,
    isNearLimit,
  };
}
