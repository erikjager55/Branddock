'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { resolveClientLangDecision } from './document-locale.shared';

/**
 * Houdt `<html lang>` correct ná de eerste server-render.
 *
 * De root layout resolvet de taal server-side, maar re-rendert NIET bij een
 * client-side navigatie tussen route-groepen. Zonder deze component blijft een
 * bezoeker die vanaf `/marketing/pricing` op een CTA klikt met `lang="nl"` in
 * de Engelse app-shell staan — die CTA's zijn relatieve `next/link`s zolang
 * `NEXT_PUBLIC_APP_URL` leeg is, dus dat is een echt pad, geen randgeval.
 *
 * De beslissing loopt via `resolveClientLangDecision`, die het browserpad
 * eerst door dezelfde host-routing haalt als de middleware. Dat is essentieel:
 * op de marketing-apex is `/` de Nederlandse homepage en op een workspace-host
 * is `/<slug>` een klantpagina. Een client die alleen `usePathname()` leest
 * ziet daar iets anders dan de server en zou de taal terugzetten naar Engels.
 */
export function DocumentLangSync() {
  const { i18n } = useTranslation();
  const pathname = usePathname();

  useEffect(() => {
    // `window.location.host` staat bewust niet in de deps: de host kan niet
    // wijzigen zonder volledige page load, en dan mount deze component opnieuw.
    const decision = resolveClientLangDecision(window.location.host, pathname);

    // Klantpagina: de taal komt uit de database en is hier niet af te leiden.
    if (decision.kind === 'leave') return;

    if (decision.kind === 'fixed') {
      document.documentElement.lang = decision.lang;
      return;
    }

    // App-route: de UI-taal bezit het attribuut, inclusief latere wissels.
    document.documentElement.lang = i18n.language;
    const onChange = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', onChange);
    return () => {
      i18n.off('languageChanged', onChange);
    };
  }, [pathname, i18n]);

  return null;
}
