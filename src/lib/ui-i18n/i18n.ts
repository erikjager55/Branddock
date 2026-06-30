import i18next, { type i18n as I18nInstance, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_UI_LOCALE, UI_NAMESPACES, type UiLocale } from './config';
import enCommon from './locales/en/common';
import enNavigation from './locales/en/navigation';
import nlCommon from './locales/nl/common';
import nlNavigation from './locales/nl/navigation';

// Chrome namespaces are statically bundled (small, always visible) so the
// first paint resolves keys without a network round-trip — no flash.
const resources = {
  en: { common: enCommon, navigation: enNavigation },
  nl: { common: nlCommon, navigation: nlNavigation },
} as unknown as Resource;

/**
 * Create a fresh i18next instance seeded with `initialLocale`.
 * Intentionally NOT a module-level singleton: on the server this runs per
 * request, so a shared instance would bleed one request's locale into another.
 * The client keeps it stable via a ref in I18nProvider.
 */
export function createI18n(initialLocale: UiLocale): I18nInstance {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng: DEFAULT_UI_LOCALE,
    ns: [...UI_NAMESPACES],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
