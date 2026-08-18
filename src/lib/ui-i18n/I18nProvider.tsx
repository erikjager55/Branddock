'use client';

import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { createI18n } from './i18n';
import type { UiLocale } from './config';
import { LocaleReconciler } from './LocaleReconciler';
import { DocumentLangSync } from './DocumentLangSync';

/**
 * Mounts the i18next runtime for the whole app + login chrome.
 * `initialLocale` is resolved server-side from the `branddock-ui-locale`
 * cookie in layout.tsx, so SSR and the client agree (no hydration flash).
 *
 * `<html lang>` wordt bewust NIET hier beheerd maar in `DocumentLangSync`.
 * Niet vanwege de bestandssplitsing — die component mount óók één keer — maar
 * omdat het attribuut aan de ROUTE hangt en dus op `usePathname()` moet
 * reageren. Zet je die logica hier terug zónder pathname-dependency, dan blijft
 * na een client-navigatie de taal van de vórige route-groep staan.
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

  return (
    <I18nextProvider i18n={i18n}>
      <LocaleReconciler />
      <DocumentLangSync />
      {children}
    </I18nextProvider>
  );
}
