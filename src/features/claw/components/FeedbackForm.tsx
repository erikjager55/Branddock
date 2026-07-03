'use client';

import React, { useState } from 'react';
import {
  MessageSquarePlus,
  X,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClawStore } from '@/stores/useClawStore';
import type { FeedbackSentiment, FeedbackTag } from '@/stores/useClawStore';

// Tailwind 4 in this repo is a compiled stylesheet; many color shades are
// missing from src/index.css (see gotchas.md). Inline hex lives on the
// active state so the buttons render regardless of purge state.
const SENTIMENTS: {
  value: FeedbackSentiment;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  activeStyle: React.CSSProperties;
}[] = [
  {
    value: 'positive',
    icon: ThumbsUp,
    activeStyle: {
      backgroundColor: '#d1fae5', // emerald-100
      color: '#047857', // emerald-700
      boxShadow: '0 0 0 2px #a7f3d0', // emerald-200 ring
    },
  },
  {
    value: 'neutral',
    icon: Minus,
    activeStyle: {
      backgroundColor: '#e5e7eb', // gray-200
      color: '#374151', // gray-700
      boxShadow: '0 0 0 2px #d1d5db', // gray-300 ring
    },
  },
  {
    value: 'negative',
    icon: ThumbsDown,
    activeStyle: {
      backgroundColor: '#ffe4e6', // rose-100
      color: '#be123c', // rose-700
      boxShadow: '0 0 0 2px #fecdd3', // rose-200 ring
    },
  },
];

const VIOLET = {
  card: '#f5f3ff', // violet-50
  border: '#ddd6fe', // violet-200
  iconBg: '#ede9fe', // violet-100
  iconText: '#6d28d9', // violet-700
  subtle: '#8b5cf6', // violet-500
  primary: '#7c3aed', // violet-600
  primaryHover: '#6d28d9', // violet-700
};

const TAGS: { value: FeedbackTag }[] = [
  { value: 'inaccurate' },
  { value: 'off-brand' },
  { value: 'too-verbose' },
  { value: 'too-generic' },
  { value: 'unhelpful' },
  { value: 'other' },
];

const COLLAPSE_THRESHOLD = 300;

export function FeedbackForm() {
  const { t } = useTranslation('claw');
  const { feedbackForm, updateFeedbackForm, closeFeedbackForm, addMessage } =
    useClawStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [snippetExpanded, setSnippetExpanded] = useState(false);

  if (!feedbackForm) return null;

  const snippet = feedbackForm.messageContent;
  const isLongSnippet = (snippet?.length ?? 0) > COLLAPSE_THRESHOLD;
  const shownSnippet =
    snippet && isLongSnippet && !snippetExpanded
      ? snippet.slice(0, COLLAPSE_THRESHOLD) + '…'
      : snippet;

  const toggleTag = (tag: FeedbackTag) => {
    const has = feedbackForm.tags.includes(tag);
    updateFeedbackForm({
      tags: has
        ? feedbackForm.tags.filter((t) => t !== tag)
        : [...feedbackForm.tags, tag],
    });
  };

  const handleSubmit = async () => {
    if (!feedbackForm.comment.trim()) {
      setError(t('feedback.commentRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/chat-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentiment: feedbackForm.sentiment,
          tags: feedbackForm.tags,
          comment: feedbackForm.comment.trim(),
          page: feedbackForm.page,
          conversationId: feedbackForm.conversationId,
          messageId: feedbackForm.messageId,
          messageContent: feedbackForm.messageContent,
        }),
      });

      if (!res.ok) {
        let msg = t('feedback.requestFailed', { status: res.status });
        try {
          const data = await res.json();
          if (typeof data?.error === 'string') {
            msg = data.error;
          } else if (data?.error && typeof data.error === 'object') {
            // Zod flatten: { formErrors: [...], fieldErrors: { field: [...] } }
            const first =
              data.error.formErrors?.[0] ??
              Object.values(data.error.fieldErrors ?? {}).flat()[0];
            if (first) msg = String(first);
          } else if (typeof data?.details === 'object') {
            const first =
              data.details.formErrors?.[0] ??
              Object.values(data.details.fieldErrors ?? {}).flat()[0];
            if (first) msg = String(first);
          }
        } catch {
          // non-JSON body (server 500 HTML page); keep status fallback
        }
        throw new Error(msg);
      }

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('feedback.logged', { sentiment: feedbackForm.sentiment }),
        createdAt: new Date().toISOString(),
      });

      closeFeedbackForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedback.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{
        border: `1px solid ${VIOLET.border}`,
        backgroundColor: VIOLET.card,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: VIOLET.iconBg }}
          >
            <MessageSquarePlus size={14} style={{ color: VIOLET.iconText }} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{t('feedback.title')}</h3>
        </div>
        <button
          onClick={closeFeedbackForm}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
          aria-label={t('feedback.close')}
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {/* Snippet preview — the AI response this feedback is about */}
      {snippet && (
        <div
          className="rounded-lg bg-white"
          style={{ border: `1px solid ${VIOLET.iconBg}` }}
        >
          <button
            type="button"
            onClick={() => isLongSnippet && setSnippetExpanded((v) => !v)}
            className="flex items-start gap-2 w-full px-3 py-2 text-left"
            disabled={!isLongSnippet}
          >
            {isLongSnippet ? (
              snippetExpanded ? (
                <ChevronDown size={14} className="mt-0.5 flex-shrink-0" style={{ color: VIOLET.subtle }} />
              ) : (
                <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: VIOLET.subtle }} />
              )
            ) : (
              <span className="w-[14px]" />
            )}
            <div className="flex-1 min-w-0">
              <div
                className="text-[11px] uppercase tracking-wide font-medium mb-0.5"
                style={{ color: VIOLET.subtle }}
              >
                {t('feedback.aboutResponse')}
              </div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                {shownSnippet}
              </p>
            </div>
          </button>
        </div>
      )}
      {!snippet && (
        <div
          className="rounded-lg bg-white px-3 py-2"
          style={{ border: `1px solid ${VIOLET.iconBg}` }}
        >
          <div
            className="text-[11px] uppercase tracking-wide font-medium mb-0.5"
            style={{ color: VIOLET.subtle }}
          >
            {t('feedback.generalFeedback')}
          </div>
          <p className="text-xs text-gray-500">
            {t('feedback.noReply')}
          </p>
        </div>
      )}

      {/* Sentiment */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('feedback.sentimentLabel')}</label>
        <div className="flex gap-2">
          {SENTIMENTS.map((s) => {
            const Icon = s.icon;
            const isActive = feedbackForm.sentiment === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => updateFeedbackForm({ sentiment: s.value })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive ? '' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                style={isActive ? s.activeStyle : undefined}
                aria-pressed={isActive}
              >
                <Icon size={13} />
                {t(`feedback.sentiments.${s.value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {t('feedback.tagsLabel')} <span className="text-gray-400">{t('feedback.optional')}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const isActive = feedbackForm.tags.includes(tag.value);
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isActive ? { backgroundColor: VIOLET.primary } : undefined}
                aria-pressed={isActive}
              >
                {t(`feedback.tags.${tag.value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('feedback.commentLabel')}
        </label>
        <textarea
          value={feedbackForm.comment}
          onChange={(e) => updateFeedbackForm({ comment: e.target.value })}
          placeholder={t('feedback.commentPlaceholder')}
          rows={4}
          maxLength={5000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2"
          style={{ outline: 'none', boxShadow: undefined }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 2px ${VIOLET.primary}66`;
            e.currentTarget.style.borderColor = VIOLET.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '';
            e.currentTarget.style.borderColor = '';
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600" role="alert">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !feedbackForm.comment.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor:
              isSubmitting || !feedbackForm.comment.trim() ? '#9ca3af' : VIOLET.primary,
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting && feedbackForm.comment.trim()) {
              e.currentTarget.style.backgroundColor = VIOLET.primaryHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting && feedbackForm.comment.trim()) {
              e.currentTarget.style.backgroundColor = VIOLET.primary;
            }
          }}
        >
          {isSubmitting ? t('feedback.submitting') : t('feedback.submit')}
        </button>
        <button
          type="button"
          onClick={closeFeedbackForm}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {t('feedback.cancel')}
        </button>
      </div>
    </div>
  );
}
