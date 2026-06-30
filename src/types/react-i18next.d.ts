// Compile-time key safety for useTranslation()/t() — derives the typed
// resource shape from the canonical English catalogs (no `any`).
import 'react-i18next';
import type enCommon from '@/lib/ui-i18n/locales/en/common';
import type enNavigation from '@/lib/ui-i18n/locales/en/navigation';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      navigation: typeof enNavigation;
    };
  }
}
