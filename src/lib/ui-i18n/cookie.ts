'use client';

import { UI_LOCALE_COOKIE, type UiLocale } from './config';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Persist the UI locale in a non-httpOnly cookie so SSR can read it for first paint. */
export function writeUiLocaleCookie(locale: UiLocale): void {
  if (typeof document === 'undefined') return;
  const secure =
    typeof location !== 'undefined' && location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${UI_LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure}`;
}
