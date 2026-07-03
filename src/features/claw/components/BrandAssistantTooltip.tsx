'use client';

import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openClawWithPrompt } from '../lib/open-with-prompt';
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from '@/hooks/use-user-preferences';

const PREFERENCE_KEY = 'brandAssistantTipDismissed';

/**
 * Sprint B · Step 3.D — one-time discovery nudge, DB-backed.
 *
 * Shows a small, dismissible tooltip in the bottom-right corner the first
 * time a user lands on a page that renders this component (typically the
 * Content Library). Dismiss state persists in `UserProfile.preferences` so
 * the tooltip never re-appears for that user — across browsers/devices.
 *
 * Unauthenticated users fall through to a default of "undismissed" and see
 * the tooltip; the dismiss mutation silently no-ops (the API returns 401
 * which the hook swallows), which is the right behavior for a non-critical
 * discovery prompt.
 */
export function BrandAssistantTooltip() {
  const { t } = useTranslation('claw');
  const { data: preferences, isLoading } = useUserPreferences();
  const update = useUpdateUserPreferences();

  // Hide while preferences are loading so we don't flash the tooltip for
  // users who've already dismissed it in a prior session.
  if (isLoading) return null;

  const dismissed = preferences?.[PREFERENCE_KEY] === true;
  if (dismissed) return null;

  const dismiss = () => {
    update.mutate({ [PREFERENCE_KEY]: true });
  };

  const tryIt = () => {
    openClawWithPrompt(t('tooltip.tryPrompt'));
    dismiss();
  };

  return (
    <div
      role="dialog"
      aria-label={t('tooltip.ariaLabel')}
      className="fixed bottom-6 right-6 z-40 max-w-xs bg-white border border-teal-200 rounded-xl shadow-lg p-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="h-4 w-4 text-teal-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">
            {t('tooltip.title')}
          </div>
          <p className="mt-1 text-[12px] text-gray-600">
            {t('tooltip.body')}{' '}
            <span className="italic">{t('tooltip.example')}</span>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={tryIt}
              disabled={update.isPending}
              className="text-[12px] font-medium px-2.5 py-1 rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {t('tooltip.tryItNow')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              disabled={update.isPending}
              className="text-[12px] font-medium px-2.5 py-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-60"
            >
              {t('tooltip.notNow')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={update.isPending}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-60"
          aria-label={t('tooltip.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
