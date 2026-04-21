'use client';

import { useQuery } from '@tanstack/react-query';

export type FeedbackAiStatus = 'pending' | 'analyzing' | 'ready' | 'failed';

export interface FeedbackItem {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  comment: string;
  page: string | null;
  conversationId: string | null;
  messageId: string | null;
  messageContent: string | null;
  aiSuggestion: string | null;
  aiStatus: FeedbackAiStatus;
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  notes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  reviewedBy: { name: string | null; email: string } | null;
  workspace: { name: string } | null;
}

/**
 * Shared query for cross-workspace chat feedback used by the developer
 * triage tab and the sub-nav badge. One cache key (`feedback-triage`)
 * means both consumers share the same response.
 */
export function useChatFeedbackTriage(enabled = true) {
  return useQuery({
    queryKey: ['feedback-triage'],
    queryFn: async (): Promise<FeedbackItem[]> => {
      const res = await fetch('/api/chat-feedback?all=true');
      if (!res.ok) {
        let msg = `Failed (${res.status})`;
        if (res.status === 401) msg = 'Not signed in';
        else if (res.status === 403) msg = 'Developer access required';
        else {
          try {
            const data = await res.json();
            if (typeof data?.error === 'string') msg = data.error;
          } catch {
            // ignore
          }
        }
        throw new Error(msg);
      }
      const json = await res.json();
      return (json.feedback ?? []) as FeedbackItem[];
    },
    enabled,
    refetchInterval: 15_000,
  });
}
