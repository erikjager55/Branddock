import { prisma } from '@/lib/prisma';
import { SUPPORTED_LOCALES } from '@/lib/brand-fidelity/heuristics/locale-resolver';
import { isShippedContentLanguage } from './shipped-languages';
export { SHIPPED_CONTENT_LANGUAGES } from './shipped-languages';
export type { ShippedContentLanguage } from './shipped-languages';

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
 * Precedentie bij AANMAAK/REPARATIE van het default-profiel (ADR 2026-07-16):
 * voiceguide.contentLocale → localeForLanguage(workspace.contentLanguage) → en-GB.
 * Gelijk aan `backfill-brand-locale-profiles.ts` zodat backfill en provisioning niet
 * uiteenlopen. Geldt uitsluitend bij aanmaak — een bestaand profiel wint altijd.
 *
 * Valideert tegen SUPPORTED_LOCALES (de set die `BrandVoiceguide.contentLocale` mág
 * bevatten), NIET tegen de values van LANG_TO_LOCALE. Die twee zijn verschillende sets
 * met een verschillend doel: LANG_TO_LOCALE mapt de 7 contentLanguage-codes naar een
 * default-locale; SUPPORTED_LOCALES is de F-VAL-whitelist en bevat óók `nl-BE` — een
 * gewone picker-optie ("Nederlands (België)"). Op de LANG_TO_LOCALE-values valideren
 * gooide `nl-BE` weg, waarna een Vlaams merk met contentLanguage='en' (de @default) via
 * de repair een `en-GB`-anker kreeg en stil van Nederlands naar Engels flipte — exact
 * de bug die deze ADR opheft.
 */
export function resolveInitialLocale(
  voiceguideLocale: string | null | undefined,
  contentLanguage: string | null | undefined,
): string {
  const vg = voiceguideLocale?.trim();
  if (vg && (SUPPORTED_LOCALES as readonly string[]).includes(vg)) return vg;
  return contentLanguage ? localeForLanguage(contentLanguage) : 'en-GB';
}

/**
 * BCP-47-locale → ISO-639-1 taalcode voor `Workspace.contentLanguage`. Via het
 * base-subtag i.p.v. een omgekeerde LANG_TO_LOCALE-map: die zou `nl-BE` (en straks elk
 * Fase-2 marktprofiel) op `undefined` zetten, waardoor de reconcile 'm stil overslaat en
 * de settings-UI blijft liegen. Retourneert null als de taal geen geldige
 * contentLanguage-waarde is.
 */
export function languageForLocale(locale: string): string | null {
  const base = locale.split('-')[0]?.toLowerCase();
  return base && base in LANG_TO_LOCALE ? base : null;
}

/**
 * Borgt Brand + isDefault-profiel voor een workspace, binnen een transactie.
 *
 * GEDEELD DOOR ELK PAD DAT EEN WORKSPACE AANMAAKT — `provisionNewUser` (sign-up) en
 * `POST /api/workspaces`. Reden dat dit een helper is en geen gekopieerd blok: tot
 * 2026-07-16 deed alleen de workspaces-route dit, en het sign-up-pad niet. Gevolg: 3 van
 * de 4 prod-workspaces hadden geen locale-anker, `resolveTargetProfile` gaf `null` en
 * generatie was niet locale-adresseerbaar. Twee paden, dezelfde plicht, één die 'm niet
 * kende — precies de "twee plekken houden dezelfde waarheid bij"-familie uit gotchas.md.
 * Deel de helper, niet de aanroep.
 *
 * Idempotent én NIET-clobberend: bestaat er al een default-profiel, dan blijft dat staan.
 * Alleen een expliciete gebruikerskeuze (syncDefaultLocaleProfile) mag een bestaande
 * locale wijzigen — zie ADR 2026-07-16.
 */
export async function ensureBrandWithDefaultProfile(
  tx: Pick<typeof prisma, 'brand' | 'brandLocaleProfile'>,
  workspaceId: string,
  locale: string,
): Promise<void> {
  const brand = await tx.brand.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
    select: { id: true },
  });
  const existing = await tx.brandLocaleProfile.findFirst({
    where: { workspaceId, isDefault: true },
    select: { id: true },
  });
  if (existing) return;
  await tx.brandLocaleProfile.create({
    data: { brandId: brand.id, workspaceId, locale, isDefault: true },
  });
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

/**
 * Resolveert een gekozen target-taal (Fase 2 picker) naar een BrandLocaleProfile-id.
 * FIND-OR-CREATE een niet-default profiel (locale via LANG_TO_LOCALE), zodat generatie
 * direct locale-adresseerbaar is zonder de multi-markt-UI (Fase 4). Idempotent via
 * @@unique([workspaceId, locale]); zet NOOIT een 2e isDefault. Weggelaten/ongeldige
 * targetLanguage → het default-profiel (= het bestaande default-pad).
 */
export async function resolveTargetProfile(
  workspaceId: string,
  targetLanguage?: string,
): Promise<{ id: string; locale: string } | null> {
  if (!targetLanguage || !isShippedContentLanguage(targetLanguage)) {
    return prisma.brandLocaleProfile.findFirst({
      where: { workspaceId, isDefault: true },
      select: { id: true, locale: true },
    });
  }
  const locale = localeForLanguage(targetLanguage);
  const existing = await prisma.brandLocaleProfile.findUnique({
    where: { workspaceId_locale: { workspaceId, locale } },
    select: { id: true, locale: true },
  });
  if (existing) return existing;
  const brand = await prisma.brand.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
    select: { id: true },
  });
  return prisma.brandLocaleProfile.create({
    data: { brandId: brand.id, workspaceId, locale, isDefault: false },
    select: { id: true, locale: true },
  });
}
