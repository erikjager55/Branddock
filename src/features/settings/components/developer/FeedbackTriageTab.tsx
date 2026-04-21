'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquarePlus,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X as XIcon,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface FeedbackItem {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  comment: string;
  conversationId: string | null;
  messageId: string | null;
  messageContent: string | null;
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  notes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  reviewedBy: { name: string | null; email: string } | null;
  workspace: { name: string } | null;
}

// ─── Constants ──────────────────────────────────────────────

const SENTIMENT_STYLES: Record<FeedbackItem['sentiment'], { label: string; cls: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  positive: { label: 'Positive', cls: 'bg-emerald-100 text-emerald-700', Icon: ThumbsUp },
  neutral: { label: 'Neutral', cls: 'bg-gray-200 text-gray-700', Icon: Minus },
  negative: { label: 'Negative', cls: 'bg-rose-100 text-rose-700', Icon: ThumbsDown },
};

const STATUS_FILTERS = ['all', 'new', 'reviewed', 'actioned', 'dismissed'] as const;

const STATUS_ACTIONS: Array<{
  value: FeedbackItem['status'];
  label: string;
  cls: string;
}> = [
  { value: 'reviewed', label: 'Reviewed', cls: 'bg-blue-600 hover:bg-blue-700' },
  { value: 'actioned', label: 'Actioned', cls: 'bg-emerald-600 hover:bg-emerald-700' },
  { value: 'dismissed', label: 'Dismiss', cls: 'bg-gray-600 hover:bg-gray-700' },
];

// ─── Component ──────────────────────────────────────────────

export function FeedbackTriageTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [sentimentFilter, setSentimentFilter] = useState<FeedbackItem['sentiment'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['feedback-triage'],
    queryFn: async (): Promise<FeedbackItem[]> => {
      const res = await fetch('/api/chat-feedback?all=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.feedback ?? [];
    },
    refetchInterval: 15_000,
  });

  const entries = data ?? [];
  const filtered = entries.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (sentimentFilter !== 'all' && e.sentiment !== sentimentFilter) return false;
    return true;
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string; status?: FeedbackItem['status']; notes?: string }) => {
      const { id, ...body } = args;
      const res = await fetch(`/api/chat-feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback-triage'] }),
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const newCount = entries.filter((e) => e.status === 'new').length;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <MessageSquarePlus size={18} className="text-violet-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Feedback</h2>
            <p className="text-sm text-gray-500">
              {newCount} new {newCount === 1 ? 'entry' : 'entries'} to review
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({entries.filter((e) => e.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(['all', 'positive', 'neutral', 'negative'] as const).map((s) => {
            const isActive = sentimentFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSentimentFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All sentiments' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-gray-400">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading feedback...
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          No feedback {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'yet'}.
        </div>
      )}

      {/* Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((e) => {
            const isExpanded = expandedId === e.id;
            const s = SENTIMENT_STYLES[e.sentiment];
            const SentimentIcon = s.Icon;
            return (
              <div
                key={e.id}
                className={`border rounded-xl transition-colors ${
                  e.status === 'new' ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(e.id)}
                  className="flex items-start gap-3 w-full px-4 py-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="mt-1 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="mt-1 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${s.cls}`}>
                        <SentimentIcon size={11} />
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {e.user.name || e.user.email}
                      </span>
                      {e.workspace && (
                        <span className="text-xs text-gray-400">· {e.workspace.name}</span>
                      )}
                      {e.tags.length > 0 && (
                        <span className="text-xs text-gray-400">
                          · {e.tags.join(', ')}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{e.comment}</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/50">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-1">
                        Comment
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{e.comment}</p>
                    </div>

                    {e.messageContent && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-1">
                          Assistant response they reacted to
                        </div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg px-3 py-2 max-h-64 overflow-y-auto">
                          {e.messageContent}
                        </div>
                      </div>
                    )}

                    {e.status !== 'new' && e.reviewedBy && (
                      <div className="text-xs text-gray-500">
                        Status: <span className="font-medium capitalize">{e.status}</span>
                        {' · '}
                        {e.reviewedBy.name || e.reviewedBy.email}
                        {e.reviewedAt && ` · ${new Date(e.reviewedAt).toLocaleString('en-US')}`}
                      </div>
                    )}

                    {/* Actions */}
                    {e.status === 'new' && (
                      <div className="flex gap-2 pt-1">
                        {STATUS_ACTIONS.map((a) => (
                          <button
                            key={a.value}
                            type="button"
                            disabled={updateMutation.isPending}
                            onClick={() => updateMutation.mutate({ id: e.id, status: a.value })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40 ${a.cls}`}
                          >
                            {a.value === 'dismissed' ? <XIcon size={12} /> : <Check size={12} />}
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Revert option for already-reviewed entries */}
                    {e.status !== 'new' && (
                      <button
                        type="button"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: e.id, status: 'new' })}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
