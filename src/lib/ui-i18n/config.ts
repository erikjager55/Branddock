// =============================================================
// UI-i18n config — the language the user READS the app in.
//
// STRICTLY SEPARATE from the CONTENT-locale system in
// `src/lib/i18n/` (franc-min) and `Workspace.contentLanguage` /
// `BrandVoiceguide.contentLocale`, which govern the language the
// AI WRITES brand content in. Never couple the two.
// See ADR docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md
// =============================================================

/** Locales with a complete, shipped UI-string bundle. */
export const SHIPPED_LOCALES = ['en', 'nl'] as const;

export type UiLocale = (typeof SHIPPED_LOCALES)[number];

export const DEFAULT_UI_LOCALE: UiLocale = 'en';

/** Non-httpOnly so the server can read it for SSR and the client can seed synchronously. */
export const UI_LOCALE_COOKIE = 'branddock-ui-locale';

export const UI_NAMESPACES = ['common', 'navigation'] as const;

/** Endonym labels (a language is shown in its own language, not translated). */
export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  nl: 'Nederlands',
};

/** Validate an arbitrary value to a shipped locale, falling back to the default. */
export function resolveUiLocale(value: string | null | undefined): UiLocale {
  return (SHIPPED_LOCALES as readonly string[]).includes(value ?? '')
    ? (value as UiLocale)
    : DEFAULT_UI_LOCALE;
}
