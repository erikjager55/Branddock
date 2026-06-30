'use client';

import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card } from '@/components/shared';
import { useAppearance, useUpdateAppearance } from '@/hooks/use-settings';
import { SHIPPED_LOCALES, UI_LOCALE_LABELS, resolveUiLocale } from '@/lib/ui-i18n/config';
import { writeUiLocaleCookie } from '@/lib/ui-i18n/cookie';

/**
 * Per-user "Display language" selector — the language the user READS the app in.
 * Deliberately separate from the per-workspace Content language (Workspaces tab).
 * Writes AppearancePreference.language + the branddock-ui-locale cookie and flips
 * the live i18next locale. Does NOT touch any content-generation locale.
 */
export function AppearanceTab() {
  const { t, i18n } = useTranslation('common');
  const { data, isLoading } = useAppearance();
  const updateAppearance = useUpdateAppearance();
  const current = resolveUiLocale(data?.appearance?.language ?? i18n.language);

  function handleChange(value: string) {
    const next = resolveUiLocale(value);
    if (next === current) return;
    void i18n.changeLanguage(next);
    writeUiLocaleCookie(next);
    updateAppearance.mutate(
      { language: next },
      {
        onSuccess: () => toast.success(t('appearance.saved')),
        onError: () => toast.error(t('appearance.saveFailed')),
      },
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <Card padding="lg">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Globe className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('appearance.displayLanguageTitle')}
              </h3>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {t('appearance.scopeOnlyYou')}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {t('appearance.displayLanguageHelp')}
            </p>
            <select
              value={current}
              onChange={(e) => handleChange(e.target.value)}
              disabled={updateAppearance.isPending || isLoading}
              aria-label={t('appearance.displayLanguageTitle')}
              className="mt-4 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              {SHIPPED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {UI_LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
