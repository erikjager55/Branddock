'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { createI18n } from './i18n';
import type { UiLocale } from './config';
import { LocaleReconciler } from './LocaleReconciler';

/**
 * Mounts the i18next runtime for the whole app + login chrome.
 * `initialLocale` is resolved server-side from the `branddock-ui-locale`
 * cookie in layout.tsx, so SSR and the client agree (no hydration flash).
 */
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: UiLocale;
  children: React.ReactNode;
}) {
  // Lazy state-init: one instance per mount, created exactly once. On the
  // server this runs per request (no singleton bleed); on the client it stays
  // stable across re-renders — without reading a ref during render.
  const [i18n] = useState<I18nInstance>(() => createI18n(initialLocale));

  useEffect(() => {
    const onChange = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', onChange);
    document.documentElement.lang = i18n.language;
    return () => {
      i18n.off('languageChanged', onChange);
    };
  }, [i18n]);

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleReconciler />
      {children}
    </I18nextProvider>
  );
}
