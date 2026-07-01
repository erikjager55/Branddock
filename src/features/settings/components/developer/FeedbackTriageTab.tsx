'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  AlertCircle,
  Sparkles,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { MarkdownContent } from '@/features/claw/components/MarkdownContent';
import {
  useChatFeedbackTriage,
  type FeedbackItem,
  type FeedbackAiStatus,
} from '@/hooks/use-chat-feedback';

// ─── Constants ──────────────────────────────────────────────

const SENTIMENT_STYLES: Record<FeedbackItem['sentiment'], { label: string; cls: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  positive: { label: 'Positive', cls: 'bg-emerald-100 text-emerald-700', Icon: ThumbsUp },
  neutral: { label: 'Neutral', cls: 'bg-gray-200 text-gray-700', Icon: Minus },
  negative: { label: 'Negative', cls: 'bg-rose-100 text-rose-700', Icon: ThumbsDown },
};

const STATUS_FILTERS = ['all', 'new', 'reviewed', 'actioned', 'dismissed'] as const;

// Tailwind 4 purge drops many color shades (gotchas.md). Inline hex so
// the buttons render regardless of which classes ended up compiled.
const STATUS_ACTIONS: Array<{
  value: FeedbackItem['status'];
  label: string;
  bg: string;
  bgHover: string;
}> = [
  { value: 'reviewed', label: 'Reviewed', bg: '#2563eb', bgHover: '#1d4ed8' }, // blue-600/700
  { value: 'actioned', label: 'Actioned', bg: '#059669', bgHover: '#047857' }, // emerald-600/700
  { value: 'dismissed', label: 'Dismiss', bg: '#4b5563', bgHover: '#374151' }, // gray-600/700
];

const GRAY_800 = '#1f2937';
const VIOLET_700 = '#6d28d9';

const AI_STATUS_INDICATOR: Record<FeedbackAiStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock size={12} />, label: 'Pending', color: 'text-gray-400' },
  analyzing: { icon: <Loader2 size={12} className="animate-spin" />, label: 'Analyzing...', color: 'text-blue-500' },
  ready: { icon: <Sparkles size={12} />, label: 'Suggestion ready', color: 'text-emerald-600' },
  failed: { icon: <AlertCircle size={12} />, label: 'Analysis failed', color: 'text-red-500' },
};

// ─── Component ──────────────────────────────────────────────

export function FeedbackTriageTab() {
  const { t } = useTranslation('settings-misc');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [sentimentFilter, setSentimentFilter] = useState<FeedbackItem['sentiment'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useChatFeedbackTriage(true);

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

  const reanalyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chat-feedback/${id}/reanalyze`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback-triage'] }),
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const newCount = entries.filter((e) => e.status === 'new').length;
  const suggestionReadyCount = entries.filter(
    (e) => e.aiStatus === 'ready' && e.status === 'new',
  ).length;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
            <MessageSquarePlus size={18} className="text-violet-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('feedbackTriage.heading')}</h2>
            <p className="text-sm text-gray-500">
              {t('feedbackTriage.newEntries', { count: newCount })}
              {suggestionReadyCount > 0 && (
                <span className="ml-1 text-emerald-600">
                  {t('feedbackTriage.withSuggestion', { count: suggestionReadyCount })}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isActive ? { backgroundColor: GRAY_800 } : undefined}
              >
                {t(`feedbackTriage.statusFilter.${f}`)}
                {f !== 'all' && (
                  <span className="ml-1 opacity-60">
                    ({entries.filter((e) => e.status === f).length})
                  </span>
                )}
              </button>
            );
          })}
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
                  isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isActive ? { backgroundColor: VIOLET_700 } : undefined}
              >
                {t(`feedbackTriage.sentimentFilter.${s}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                {t('feedbackTriage.loadError')}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {error instanceof Error ? error.message : String(error)}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline"
              >
                {t('feedbackTriage.retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && !error && (
        <div className="py-12 text-center text-sm text-gray-400">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          {t('feedbackTriage.loading')}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          {statusFilter !== 'all'
            ? t('feedbackTriage.emptyFiltered', { status: t(`feedbackTriage.statusFilter.${statusFilter}`) })
            : t('feedbackTriage.emptyAll')}
        </div>
      )}

      {/* Cards */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((e) => {
            const isExpanded = expandedId === e.id;
            const s = SENTIMENT_STYLES[e.sentiment];
            const SentimentIcon = s.Icon;
            const aiIndicator = AI_STATUS_INDICATOR[e.aiStatus] ?? AI_STATUS_INDICATOR.pending;
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
                        {t(`feedbackTriage.sentiment.${e.sentiment}`)}
                      </span>
                      {e.page && (
                        <span className="text-[11px] font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                          {e.page}
                        </span>
                      )}
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
                      <span className={`ml-auto flex items-center gap-1 text-[10px] font-medium whitespace-nowrap ${aiIndicator.color}`}>
                        {aiIndicator.icon}
                        {t(`feedbackTriage.aiStatus.${e.aiStatus}`)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
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
                        {t('feedbackTriage.comment')}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{e.comment}</p>
                    </div>

                    {e.messageContent && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-1">
                          {t('feedbackTriage.assistantResponse')}
                        </div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg px-3 py-2 max-h-64 overflow-y-auto">
                          {e.messageContent}
                        </div>
                      </div>
                    )}

                    {/* AI suggestion */}
                    <div className="rounded-lg border p-3" style={{ borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-medium" style={{ color: '#6d28d9' }}>
                          <Sparkles size={12} />
                          {t('feedbackTriage.aiSuggestion')}
                        </div>
                        <button
                          type="button"
                          disabled={reanalyzeMutation.isPending || e.aiStatus === 'analyzing'}
                          onClick={() => reanalyzeMutation.mutate(e.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
                          title={t('feedbackTriage.regenerateTooltip')}
                        >
                          <RefreshCw size={11} className={e.aiStatus === 'analyzing' ? 'animate-spin' : ''} />
                          {e.aiStatus === 'analyzing' ? t('feedbackTriage.analyzing') : t('feedbackTriage.regenerate')}
                        </button>
                      </div>
                      {e.aiStatus === 'ready' && e.aiSuggestion ? (
                        <div className="prose prose-sm max-w-none text-sm text-gray-800">
                          <MarkdownContent content={e.aiSuggestion} />
                        </div>
                      ) : e.aiStatus === 'failed' ? (
                        <p className="text-xs text-red-600">
                          {e.aiSuggestion ?? t('feedbackTriage.analysisFailed')}
                        </p>
                      ) : e.aiStatus === 'analyzing' ? (
                        <p className="text-xs text-gray-500 inline-flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" />
                          {t('feedbackTriage.drafting')}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">{t('feedbackTriage.queued')}</p>
                      )}
                    </div>

                    {e.status !== 'new' && e.reviewedBy && (
                      <div className="text-xs text-gray-500">
                        {t('feedbackTriage.statusPrefix')} <span className="font-medium capitalize">{e.status}</span>
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-40"
                            style={{ backgroundColor: a.bg }}
                            onMouseEnter={(ev) => {
                              if (!updateMutation.isPending) ev.currentTarget.style.backgroundColor = a.bgHover;
                            }}
                            onMouseLeave={(ev) => {
                              if (!updateMutation.isPending) ev.currentTarget.style.backgroundColor = a.bg;
                            }}
                          >
                            {a.value === 'dismissed' ? <XIcon size={12} /> : <Check size={12} />}
                            {t(`feedbackTriage.action.${a.value}`)}
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
                        {t('feedbackTriage.reopen')}
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
