// Provider-wrapper voor de design-sync-previews. NIET door de app gebruikt.
//
// WAAROM: acht shared/-componenten gebruiken `useTranslation`. Zonder i18next-context
// valt react-i18next terug op de sleutel, en toont de kaart letterlijk
// `comingSoon.defaultTitle` in plaats van Nederlandse tekst.
//
// Dit mount i18next met dezelfde locale-bestanden die de app gebruikt, maar
// STATISCH en alleen voor de namespaces die de gesyncte componenten aanspreken
// (common, shared, settings-billing, ai-errors). Bewust NIET via `createI18n`: die hangt een
// `resourcesToBackend` met een dynamische `import()` op, waardoor esbuild elk
// locale-bestand van elke taal in de bundel trekt — dat kostte 538 -> 1874 KB.
//
// Ook bewust weggelaten: `LocaleReconciler` uit de app-provider. Die leest de
// sessie en de appearance-voorkeur via TanStack Query; in een preview bestaat
// geen sessie en geen QueryClient, en het is post-login werk dat hier niet speelt.
import { useState } from 'react';
import i18next, { type i18n as I18nInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import nlCommon from '@/lib/ui-i18n/locales/nl/common';
import nlShared from '@/lib/ui-i18n/locales/nl/shared';
import nlSettingsBilling from '@/lib/ui-i18n/locales/nl/settings-billing';
import nlAiErrors from '@/lib/ui-i18n/locales/nl/ai-errors';

function createPreviewI18n(): I18nInstance {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: 'nl',
    fallbackLng: 'nl',
    defaultNS: 'common',
    ns: ['common', 'shared', 'settings-billing', 'ai-errors'],
    resources: {
      nl: {
        common: nlCommon,
        shared: nlShared,
        'settings-billing': nlSettingsBilling,
        'ai-errors': nlAiErrors,
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [i18n] = useState<I18nInstance>(createPreviewI18n);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
