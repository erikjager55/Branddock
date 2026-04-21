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
import { useClawStore } from '@/stores/useClawStore';
import type { FeedbackSentiment, FeedbackTag } from '@/stores/useClawStore';

const SENTIMENTS: {
  value: FeedbackSentiment;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  activeClasses: string;
}[] = [
  {
    value: 'positive',
    label: 'Positive',
    icon: ThumbsUp,
    activeClasses: 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    icon: Minus,
    activeClasses: 'bg-gray-200 text-gray-700 ring-2 ring-gray-300',
  },
  {
    value: 'negative',
    label: 'Negative',
    icon: ThumbsDown,
    activeClasses: 'bg-rose-100 text-rose-700 ring-2 ring-rose-200',
  },
];

const TAGS: { value: FeedbackTag; label: string }[] = [
  { value: 'inaccurate', label: 'Inaccurate' },
  { value: 'off-brand', label: 'Off-brand' },
  { value: 'too-verbose', label: 'Too verbose' },
  { value: 'too-generic', label: 'Too generic' },
  { value: 'unhelpful', label: 'Unhelpful' },
  { value: 'other', label: 'Other' },
];

const COLLAPSE_THRESHOLD = 300;

export function FeedbackForm() {
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
      setError('Please share a short comment.');
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
          conversationId: feedbackForm.conversationId,
          messageId: feedbackForm.messageId,
          messageContent: feedbackForm.messageContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.toString?.() || 'Failed to submit feedback');
      }

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Thanks — feedback logged (${feedbackForm.sentiment}). This helps us improve Branddock.`,
        createdAt: new Date().toISOString(),
      });

      closeFeedbackForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
            <MessageSquarePlus size={14} className="text-violet-700" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Share feedback</h3>
        </div>
        <button
          onClick={closeFeedbackForm}
          className="p-1 rounded-md hover:bg-violet-100 text-gray-400"
          aria-label="Close feedback form"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      {/* Snippet preview — the AI response this feedback is about */}
      {snippet && (
        <div className="rounded-lg border border-violet-100 bg-white">
          <button
            type="button"
            onClick={() => isLongSnippet && setSnippetExpanded((v) => !v)}
            className="flex items-start gap-2 w-full px-3 py-2 text-left"
            disabled={!isLongSnippet}
          >
            {isLongSnippet ? (
              snippetExpanded ? (
                <ChevronDown size={14} className="mt-0.5 text-violet-500 flex-shrink-0" />
              ) : (
                <ChevronRight size={14} className="mt-0.5 text-violet-500 flex-shrink-0" />
              )
            ) : (
              <span className="w-[14px]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-violet-500 font-medium mb-0.5">
                About this response
              </div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                {shownSnippet}
              </p>
            </div>
          </button>
        </div>
      )}
      {!snippet && (
        <div className="rounded-lg border border-violet-100 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-violet-500 font-medium mb-0.5">
            General feedback
          </div>
          <p className="text-xs text-gray-500">
            No assistant reply to anchor to — this will be logged as general feedback.
          </p>
        </div>
      )}

      {/* Sentiment */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">How did this response feel?</label>
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
                  isActive ? s.activeClasses : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                aria-pressed={isActive}
              >
                <Icon size={13} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          What kind of issue? <span className="text-gray-400">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => {
            const isActive = feedbackForm.tags.includes(t.value);
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTag(t.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={isActive}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          What would have made this better?
        </label>
        <textarea
          value={feedbackForm.comment}
          onChange={(e) => updateFeedbackForm({ comment: e.target.value })}
          placeholder="Be specific — what worked, what didn't, what was missing..."
          rows={4}
          maxLength={5000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-400"
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
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit feedback'}
        </button>
        <button
          type="button"
          onClick={closeFeedbackForm}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
