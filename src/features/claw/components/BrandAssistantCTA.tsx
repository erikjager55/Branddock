'use client';

import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openClawWithPrompt } from '../lib/open-with-prompt';

interface BrandAssistantCTAProps {
  /** Example prompts the user can click to seed the conversation. */
  prompts?: string[];
  /** Variant — "card" = full empty-state block, "tip" = inline banner above a form. */
  variant?: 'card' | 'tip';
  /** Custom headline (card variant). Defaults to "Ask the Brand Assistant". */
  title?: string;
  /** Custom subtitle/helper text. */
  subtitle?: string;
}

/**
 * Sprint B · Step 3 — surfacing for the Brand Assistant (Claw).
 *
 * A reusable CTA that makes the chat-based content creation path
 * discoverable. Shipped in two variants:
 *
 *  - `card`  — large block used in empty states (e.g. Content Library
 *              when no items match the current filters). Shows the intro
 *              plus a list of clickable example prompts; each prompt
 *              preloads the chat input and opens the overlay in one click.
 *  - `tip`   — compact single-line hint used above modal forms (e.g.
 *              AddDeliverableTypeModal) to remind power users they can
 *              skip the form and just ask the assistant instead.
 */
export function BrandAssistantCTA({
  prompts,
  variant = 'card',
  title,
  subtitle,
}: BrandAssistantCTAProps) {
  const { t } = useTranslation('claw');
  const resolvedTitle = title ?? t('cta.defaultTitle');
  const resolvedSubtitle = subtitle ?? t('cta.defaultSubtitle');

  if (variant === 'tip') {
    // Compact one-liner for use above Add forms.
    const firstPrompt = prompts?.[0];
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-teal-50 border border-teal-100 text-[12px] text-teal-900">
        <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-teal-600" />
        <div className="flex-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span>{t('cta.quickTip')}</span>
          {firstPrompt && (
            <button
              type="button"
              onClick={() => openClawWithPrompt(firstPrompt)}
              className="italic text-teal-700 underline-offset-2 hover:underline"
            >
              &ldquo;{firstPrompt}&rdquo;
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-5 w-5 text-teal-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{resolvedTitle}</h3>
          <p className="mt-1 text-[13px] text-gray-600">{resolvedSubtitle}</p>
          {prompts && prompts.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {prompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => openClawWithPrompt(prompt)}
                    className="w-full text-left text-[13px] px-3 py-2 rounded-md bg-white border border-teal-100 text-gray-700 hover:border-teal-300 hover:bg-teal-50 transition-colors flex items-start gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="flex-1 italic">&ldquo;{prompt}&rdquo;</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
