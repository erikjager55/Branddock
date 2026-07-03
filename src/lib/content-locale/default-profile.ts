import { prisma } from '@/lib/prisma';

/**
 * Content-locale foundation (ADR 2026-06-28) — helpers voor het default
 * BrandLocaleProfile per workspace.
 *
 * Het isDefault-profiel is de forward-compatible drager van de content-locale.
 * In de foundation is er precies één profiel per workspace; de per-generatie
 * target-picker (Fase 2) voegt extra markt-profielen toe.
 */

/** Workspace.contentLanguage (ISO-639-1) → default BrandLocaleProfile.locale (BCP-47). */
export const LANG_TO_LOCALE: Record<string, string> = {
  en: 'en-GB',
  nl: 'nl-NL',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  it: 'it-IT',
};

export function localeForLanguage(lang: string): string {
  return LANG_TO_LOCALE[lang] ?? 'en-GB';
}

/**
 * Houd het isDefault-profiel in sync met de gekozen content-taal. Maakt Brand +
 * profiel aan als die nog ontbreken (nieuwe/edge workspace). In-place update van
 * het default-profiel (geen extra rij) zodat de @@unique([workspaceId, locale])
 * niet botst — in de foundation bestaat alleen het default-profiel.
 */
export async function syncDefaultLocaleProfile(workspaceId: string, locale: string): Promise<void> {
  const brand = await prisma.brand.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
    select: { id: true },
  });
  const existing = await prisma.brandLocaleProfile.findFirst({
    where: { workspaceId, isDefault: true },
    select: { id: true, locale: true },
  });
  if (!existing) {
    await prisma.brandLocaleProfile.create({
      data: { brandId: brand.id, workspaceId, locale, isDefault: true },
    });
    return;
  }
  if (existing.locale !== locale) {
    await prisma.brandLocaleProfile.update({ where: { id: existing.id }, data: { locale } });
  }
}
