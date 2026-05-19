'use client';

import React from 'react';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { SimpleMarkdown } from './SimpleMarkdown';
import { InlineEditableSection, useEditableEntry } from './InlineEditableSection';
import { stripMarkdownForPlainText } from '../../../lib/strip-markdown';
import {
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Send,
  Globe,
  MoreHorizontal,
  BarChart2,
} from 'lucide-react';

/**
 * LinkedIn poll mockup — distinct from LinkedInPostPreview because
 * polls render with a structured widget (question + 2-4 options as
 * buttons + vote counter), not a free-form body. LinkedIn polls also
 * cannot have an image attachment or a Visit/CTA link card, so this
 * preview omits those slots entirely.
 *
 * Source-of-truth groups (per the linkedin-poll prompt-template +
 * component-templates-fallback registry):
 *   - context              → 30-50w paragraph above the widget
 *   - question             → poll question (max 140 chars), bold inside widget
 *   - option-1 … option-4  → option strings (max 30 chars each), rendered as
 *                            full-width grey bars; options 3 and 4 are optional
 *   - follow-up-comment    → 40-60w suggested first comment, shown italic below
 *                            the action bar as a "suggested comment" card
 *   - hashtags             → topic-relevant hashtags, rendered between widget
 *                            and action bar
 */
// LinkedIn poll-duration labels — Dutch UI copy matching real LinkedIn.
const POLL_DURATION_LABELS: Record<string, string> = {
  '1d': 'Nog 1 dag',
  '3d': 'Nog 3 dagen',
  '1w': 'Nog 1 week',
  '2w': 'Nog 2 weken',
};

export function LinkedInPollPreview({ isGenerating, brandName, mediumConfig }: PlatformPreviewProps) {
  // Inline-edit entries — call hooks unconditionally so order stays stable
  // across renders. Each `useEditableEntry` returns null when the group
  // isn't present yet, so we just gate the render below.
  const contextEntry = useEditableEntry('context');
  const questionEntry = useEditableEntry('question');
  const option1Entry = useEditableEntry('option-1');
  const option2Entry = useEditableEntry('option-2');
  const option3Entry = useEditableEntry('option-3');
  const option4Entry = useEditableEntry('option-4');
  const followUpEntry = useEditableEntry('follow-up-comment');
  const hashtagsEntry = useEditableEntry('hashtags');

  // Fallbacks for legacy generations where the model emitted everything
  // into the standard post-style groups. Lets older deliverables still
  // render readable poll previews without forced regeneration. Hooks
  // are called unconditionally — the chain is then evaluated below.
  const contextFallback = useEditableEntry('body');
  const questionFallbackHook = useEditableEntry('hook');
  const questionFallbackHeadline = useEditableEntry('headline');

  const resolvedContext = contextEntry ?? contextFallback;
  const resolvedQuestion = questionEntry ?? questionFallbackHook ?? questionFallbackHeadline;

  const name = brandName ?? 'Brand Name';
  const initial = name.charAt(0).toUpperCase();

  // Collect available option entries in order — render N options where
  // N = number of non-null option groups. Real LinkedIn polls allow 2-4.
  const optionEntries = [option1Entry, option2Entry, option3Entry, option4Entry].filter(
    (e): e is NonNullable<typeof e> => e !== null,
  );

  if (isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-full" style={{ maxWidth: '555px' }}>
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="h-2.5 w-20 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
          <div className="rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-9 rounded bg-gray-100" />
            <div className="h-9 rounded bg-gray-100" />
            <div className="h-9 rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mx-auto w-full" style={{ maxWidth: '555px' }}>
      {/* Author header — same structure as a regular LinkedIn post but with
          "Posted a poll" indicator instead of plain timestamp. */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dbeafe' }}>
              <span className="text-sm font-bold" style={{ color: '#1d4ed8' }}>{initial}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{name}</p>
              <p className="text-xs text-gray-500 leading-tight">1,234 followers</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <BarChart2 className="h-2.5 w-2.5" /> Posted a poll · Just now · <Globe className="h-2.5 w-2.5" />
              </p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Context paragraph — the 30-50w framing above the poll widget */}
      {resolvedContext && (
        <div className="px-4 pb-3">
          <InlineEditableSection
            entry={resolvedContext}
            render={(text) => (
              <div className="text-sm text-gray-800 leading-relaxed">
                <SimpleMarkdown text={text} />
              </div>
            )}
          />
        </div>
      )}

      {/* Poll widget — bordered white card with question + option bars +
          vote counter. This is the structural difference from a normal
          post: options aren't bullets, they're horizontal buttons. */}
      <div className="mx-4 mb-3 rounded-lg border border-gray-200 overflow-hidden">
        {resolvedQuestion && (
          <div className="px-4 py-3 border-b border-gray-100">
            <InlineEditableSection
              entry={resolvedQuestion}
              render={(text) => (
                <p className="text-[15px] font-semibold text-gray-900 leading-snug">
                  {stripMarkdownForPlainText(text)}
                </p>
              )}
            />
          </div>
        )}
        <div className="px-4 py-3 space-y-2">
          {optionEntries.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No options generated yet — regenerate to populate.</p>
          ) : (
            optionEntries.map((entry, idx) => (
              <InlineEditableSection
                key={idx}
                entry={entry}
                size="compact"
                render={(text) => (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-full border border-gray-300 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                    style={{ borderColor: '#d1d5db' }}
                  >
                    {stripMarkdownForPlainText(text)}
                  </button>
                )}
              />
            ))
          )}
        </div>
        {/* Vote counter footer — static mockup numbers; the remaining-time
            label reflects the pollDuration mediumConfig key (1d / 3d / 1w /
            2w — LinkedIn's allowed values). Real LinkedIn shows running
            vote count + countdown that ticks down. */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            245 stemmen · {POLL_DURATION_LABELS[(mediumConfig?.pollDuration as string) ?? '1w'] ?? 'Nog 1 week'}
          </span>
          <span className="text-xs text-gray-400">Anoniem stemmen</span>
        </div>
      </div>

      {/* Hashtags — between the widget and the action bar, same as a normal post. */}
      {hashtagsEntry && (
        <div className="px-4 pb-2">
          <InlineEditableSection
            entry={hashtagsEntry}
            render={(text) => (
              <p className="text-xs text-blue-600">{text}</p>
            )}
          />
        </div>
      )}

      {/* Engagement summary line — mirror the post layout */}
      <div className="px-4 py-1.5 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="h-4 w-4 rounded-full bg-blue-500 border border-white flex items-center justify-center">
                <ThumbsUp className="h-2 w-2 text-white" />
              </span>
            </span>
            <span>48</span>
          </div>
          <span>12 comments · 245 votes</span>
        </div>
      </div>

      {/* Action bar — Like / Comment / Repost / Send mirror a standard post. */}
      <div className="border-t border-gray-200 px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageCircle, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Send, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-2 rounded hover:bg-gray-100 text-xs font-medium text-gray-600">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Suggested first comment — the follow-up-comment group, shown as a
          "your draft" card below the action bar. Not part of the rendered
          post itself; it's a publishing aid the user copies after posting. */}
      {followUpEntry && (
        <div className="mx-4 mb-3 mt-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Suggested first comment
          </p>
          <InlineEditableSection
            entry={followUpEntry}
            render={(text) => (
              <p className="text-xs text-gray-700 italic leading-relaxed">
                <SimpleMarkdown text={text} />
              </p>
            )}
          />
        </div>
      )}
    </div>
  );
}
