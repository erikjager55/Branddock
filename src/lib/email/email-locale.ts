// =============================================================
// E-mail-taal — transactionele mail volgt de taalvoorkeur van de
// gebruiker (Settings → Appearance → language, AppearancePreference).
//
// Resolutie-volgorde: DB-voorkeur → Accept-Language van het request
// (nieuwe gebruikers hebben nog geen voorkeur-rij) → 'en'.
// Ondersteunde e-mailtalen = de UI-talen (en/nl).
// =============================================================

import { prisma } from '@/lib/prisma';

export type EmailLocale = 'en' | 'nl';

/** Normaliseer een taalcode ('nl', 'nl-NL', …) naar een ondersteunde e-mailtaal. */
export function normalizeEmailLocale(lang?: string | null): EmailLocale | null {
  if (!lang) return null;
  const lower = lang.toLowerCase();
  if (lower === 'nl' || lower.startsWith('nl-')) return 'nl';
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  return null;
}

/** Eerste ondersteunde taal uit een Accept-Language-header. */
export function localeFromAcceptLanguage(header?: string | null): EmailLocale | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim();
    const normalized = normalizeEmailLocale(tag);
    if (normalized) return normalized;
  }
  return null;
}

/**
 * Bepaal de e-mailtaal voor een gebruiker. Faalt stil naar 'en' — een mail
 * in de verkeerde taal is beter dan geen mail.
 */
export async function resolveEmailLocale(
  userId?: string | null,
  request?: Request,
): Promise<EmailLocale> {
  if (userId) {
    try {
      const pref = await prisma.appearancePreference.findUnique({
        where: { userId },
        select: { language: true },
      });
      const fromPref = normalizeEmailLocale(pref?.language);
      if (fromPref) return fromPref;
    } catch {
      // stil door naar de fallbacks
    }
  }
  const fromHeader = localeFromAcceptLanguage(request?.headers?.get('accept-language'));
  return fromHeader ?? 'en';
}
