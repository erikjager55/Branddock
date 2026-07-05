/**
 * Client-safe content-taal-constanten (GEEN prisma-import) — bruikbaar in zowel
 * server-routes als client-componenten (de per-generatie picker).
 */

/** Geshipte content-taal-codes (ISO-639-1). */
export const SHIPPED_CONTENT_LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'pt', 'it'] as const;
export type ShippedContentLanguage = (typeof SHIPPED_CONTENT_LANGUAGES)[number];

export function isShippedContentLanguage(v: string): v is ShippedContentLanguage {
  return (SHIPPED_CONTENT_LANGUAGES as readonly string[]).includes(v);
}

/** Picker-opties — endoniemen (getoond in de eigen taal, niet vertaald). */
export const CONTENT_LANGUAGE_OPTIONS: { code: ShippedContentLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
];
