'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, type FormatDistanceToNowOptions } from 'date-fns';
import { nl, enUS, type Locale } from 'date-fns/locale';
import { resolveUiLocale, type UiLocale } from './config';

// Map the UI locale to a BCP-47 tag for Intl.* (en keeps its historical en-US formatting).
const INTL_LOCALE: Record<UiLocale, string> = { en: 'en-US', nl: 'nl-NL' };
const DATE_FNS_LOCALE: Record<UiLocale, Locale> = { en: enUS, nl };

export interface UiFormatters {
  /** Locale-aware date (default: medium date style). */
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  /** Locale-aware number. */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Locale-aware currency (default EUR). */
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  /** Locale-aware relative time ("3 days ago" / "3 dagen geleden"). */
  formatRelative: (value: Date | string | number, options?: FormatDistanceToNowOptions) => string;
}

/**
 * Formatters bound to the active UI locale (the language the user READS the app
 * in). Use this instead of raw `toLocale*('en-US')` so dates/numbers switch with
 * the Display language. NOT tied to the content-locale.
 */
export function useFormat(): UiFormatters {
  const { i18n } = useTranslation();
  const uiLocale = resolveUiLocale(i18n.language);
  const intlLocale = INTL_LOCALE[uiLocale];
  const dfnsLocale = DATE_FNS_LOCALE[uiLocale];

  return useMemo<UiFormatters>(
    () => ({
      formatDate: (value, options) =>
        new Intl.DateTimeFormat(intlLocale, options ?? { dateStyle: 'medium' }).format(new Date(value)),
      formatNumber: (value, options) => new Intl.NumberFormat(intlLocale, options).format(value),
      formatCurrency: (value, currency = 'EUR', options) =>
        new Intl.NumberFormat(intlLocale, { style: 'currency', currency, ...options }).format(value),
      formatRelative: (value, options) =>
        formatDistanceToNow(new Date(value), { locale: dfnsLocale, addSuffix: true, ...options }),
    }),
    [intlLocale, dfnsLocale],
  );
}
