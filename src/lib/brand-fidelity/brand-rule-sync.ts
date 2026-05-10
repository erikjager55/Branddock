// ============================================================
// BrandRule auto-sync — soft migration BrandPersonality → BrandVoiceguide
//
// Two source streams are supported during the 3-6 month migration window:
//
//  1. Legacy: BrandPersonality.frameworkData.wordsWeAvoid (source: 'auto:wordsWeAvoid')
//     - Written by brand-asset framework PATCH endpoint (existing call site)
//
//  2. New: BrandVoiceguide.wordsWeAvoid + antiPatterns
//     - Written by /api/brandvoiceguide PATCH endpoint (BV-1.4)
//     - source values: 'auto:voiceguide.wordsWeAvoid' / 'auto:voiceguide.antiPatterns'
//
// When BrandVoiceguide exists for a workspace, syncWorkspaceBrandRules() drops
// the legacy 'auto:wordsWeAvoid' rules to prevent duplicates. The voiceguide
// row becomes the single source of truth — same logic as in getBrandContext().
//
// User-created BrandRule records (source=manual) are never touched.
// ============================================================

import { prisma } from '@/lib/prisma';

const SOURCE_LEGACY = 'auto:wordsWeAvoid';
const SOURCE_VOICEGUIDE_WORDS = 'auto:voiceguide.wordsWeAvoid';
const SOURCE_VOICEGUIDE_ANTI = 'auto:voiceguide.antiPatterns';

/** Normalize input — strip empty strings, lowercase, dedupe. */
function normalize(words: string[] | undefined | null): string[] {
  return Array.from(
    new Set(
      (words ?? [])
        .map((w) => (typeof w === 'string' ? w.trim() : ''))
        .filter((w) => w.length > 0)
        .map((w) => w.toLowerCase()),
    ),
  );
}

/**
 * Genereer NL-morfologische varianten voor een input-woord zodat een single
 * `wordsWeAvoid` entry meerdere FORBIDDEN_WORD-patterns oplevert. Voorbeeld:
 * "innovatief" → ["innovatief", "innovatie", "innovatieve", "innovaties"].
 *
 * Het rule-compiler word-boundary regex (`\bword\b`) matcht alleen exact —
 * zonder stem-expansie zou een user die "innovatief" invoert de tekstuele
 * variant "innovatie" missen, een veelvoorkomende NL-mismatch.
 *
 * Aanpak: deterministische suffix-rules zonder linguistic library. Dekt de
 * meest voorkomende NL-vervoegingen voor adjectives/nouns. Multi-word
 * inputs ("een ultieme luxe ervaring") worden NIET geëxpandeerd — die zijn
 * doorgaans phrase-specifiek en stem-expansie zou false-positives geven.
 *
 * Conservatieve trade-offs (precision boven recall — false-positives in
 * user-facing patterns/messages zijn schadelijker dan gemiste plurals):
 *   - User is expected to enter the base/lemma form van het woord (niet
 *     pre-inflected: "innovatief" niet "innovatieve"). Stem-expansie
 *     genereert dan flexed varianten; bij pre-inflected input genereert
 *     het over-expansie zonder kwaliteitsverlies.
 *   - `-eel` woorden krijgen alleen adjectief-flexion (`stem + 'ele'`).
 *     Substantief-plurals zoals "materieel → materialen" worden NIET
 *     gegenereerd — die plural is morfologisch onregelmatig en zou een
 *     stem-mutatie vereisen die we zonder library niet betrouwbaar doen.
 *   - `-iek` woorden krijgen alleen + 'e' (adjectief flexion). Echte NL
 *     noun-plurals zoals "techniek → technieken", "fabriek → fabrieken",
 *     "muziek → muzieken" worden NIET gegenereerd, want de regel kan
 *     adjectives ("uniek") niet betrouwbaar onderscheiden van nouns
 *     zonder linguistic library.
 *   - `-isch` woorden krijgen alleen + 'e'. De legitime substantief-vorm
 *     "automatisch → automatisme" wordt NIET gegenereerd, want voor
 *     kortere `-isch` words ("logisch", "basisch") zou het pattern
 *     non-words ("logisme", "basisme") produceren.
 *
 * Voor alle bovenstaande gemiste plurals: user moet de plural-vormen
 * handmatig in wordsWeAvoid invoeren als die actively unwanted zijn.
 *
 * Min-stem-length=4 voorkomt dat korte woorden (3 chars) zinloos worden
 * geëxpandeerd. Een input van 3 chars of korter retourneert alleen het
 * origineel.
 *
 * @internal Public alleen voor de smoke-test; niet bedoeld voor externe
 * callers. NL-locale-specific morfologie — niet gebruiken op EN-content.
 */
export function expandStemVariants(word: string): string[] {
  const w = word.trim().toLowerCase();
  // Empty-input guard: `expandStemVariants('')` zou anders `['']` retourneren,
  // wat als FORBIDDEN_WORD-pattern een lege regex (`\b\b`) zou compileren die
  // overal matcht. Sync-flow filtert empties al in `normalize()`, maar deze
  // helper is `export`ed dus defense-in-depth.
  if (w.length === 0) {
    return [];
  }
  if (w.length < 4 || /\s/.test(w)) {
    // Korte woorden of multi-word inputs: alleen origineel terug.
    return [w];
  }

  const variants = new Set<string>([w]);

  // Suffix-ief (innovatief → innovatie / innovatieve / innovaties)
  //   - stem + 'ie'   : substantief enkelvoud
  //   - stem + 'ieve' : adjectief flexed (NL -e ending)
  //   - stem + 'ies'  : substantief meervoud
  if (w.endsWith('ief')) {
    const stem = w.slice(0, -3); // "innovat"
    variants.add(stem + 'ie');
    variants.add(stem + 'ieve');
    variants.add(stem + 'ies');
  }
  // Suffix-eel (passioneel → passionele)
  //   - stem + 'ele'  : adjectief flexed
  //   (geen aparte plural — passioneel is doorgaans adjectief)
  else if (w.endsWith('eel')) {
    const stem = w.slice(0, -3);
    variants.add(stem + 'ele');
  }
  // Suffix-iek (uniek → unieke)
  //   Alleen + 'e' (adjectief flexed). 'unieken' is geen NL plural;
  //   '-iek' woorden zijn doorgaans adjectives, niet nouns.
  else if (w.endsWith('iek')) {
    variants.add(w + 'e');
  }
  // Suffix-isch (automatisch → automatische)
  //   Alleen + 'e' (adjectief flexed). '-isme' transformatie is onbetrouwbaar
  //   zonder linguistic library: "automatisch" → "automatisme" werkt, maar
  //   "logisch"/"basisch" → "logisme"/"basisme" zijn geen NL-woorden.
  else if (w.endsWith('isch')) {
    variants.add(w + 'e');
  }
  // Default-pad — voor woorden die niet onder een specifieke suffix-regel
  // vallen. Conservatief: voeg ALLEEN de NL noun-plural toe afhankelijk van
  // de woord-uitgang. Dit voorkomt non-NL ruis als "luxee" (uit "luxe + e")
  // of "kwaliteite" (uit "kwaliteit + e").
  //   - endsWith('e')  → + 's' (luxe → luxes)
  //   - anders         → + 'en' (kwaliteit → kwaliteiten)
  else {
    if (w.endsWith('e')) {
      variants.add(w + 's');
    } else {
      variants.add(w + 'en');
    }
  }

  return Array.from(variants);
}

/**
 * Bouwt de definitieve set patterns voor `wordsWeAvoid`-style sync.
 * Dedup op de uitgebreide set zodat overlap tussen entries (bv. user voert
 * zowel "innovatie" als "innovatief" in) niet leidt tot duplicate rules.
 */
function expandWordsToPatterns(words: string[]): string[] {
  const all = new Set<string>();
  for (const w of words) {
    for (const v of expandStemVariants(w)) {
      all.add(v);
    }
  }
  return Array.from(all);
}

/**
 * LEGACY entry point — sync wordsWeAvoid from BrandPersonality.frameworkData.
 * Kept for back-compat with brand-asset framework PATCH endpoint.
 *
 * Replaces all rules with source='auto:wordsWeAvoid' for this workspace.
 * Idempotent.
 */
export async function syncWordsAvoidToRules(
  workspaceId: string,
  wordsWeAvoid: string[] | undefined | null,
): Promise<{ deleted: number; created: number }> {
  const normalized = normalize(wordsWeAvoid);
  // Stem-expansie: één user-input ("innovatief") levert meerdere FORBIDDEN_WORD
  // patterns op ("innovatief", "innovatie", "innovatieve", ...) zodat NL-
  // morfologische varianten ook gevangen worden door rule-engine.
  const expanded = expandWordsToPatterns(normalized);

  const deleteResult = await prisma.brandRule.deleteMany({
    where: { workspaceId, source: SOURCE_LEGACY },
  });

  if (expanded.length === 0) {
    return { deleted: deleteResult.count, created: 0 };
  }

  const created = await prisma.brandRule.createMany({
    data: expanded.map((word) => ({
      workspaceId,
      ruleType: 'FORBIDDEN_WORD' as const,
      pattern: word,
      patternIsRegex: false,
      message: `Avoid the word "${word}" — listed in BrandPersonality.wordsWeAvoid.`,
      severity: 'warning',
      contentTypeFilter: [],
      isActive: true,
      source: SOURCE_LEGACY,
    })),
  });

  return { deleted: deleteResult.count, created: created.count };
}

/**
 * Sync BrandVoiceguide.wordsWeAvoid + antiPatterns into BrandRule records.
 * Two separate source streams so each list can be replaced independently.
 *
 * Replaces rules with source='auto:voiceguide.wordsWeAvoid' or
 * source='auto:voiceguide.antiPatterns' for this workspace.
 *
 * Anti-patterns get severity='error' (stronger signal than wordsWeAvoid)
 * since they explicitly enumerate phrasings the brand should never use.
 */
export async function syncVoiceguideToRules(
  workspaceId: string,
  payload: {
    wordsWeAvoid?: string[] | null;
    antiPatterns?: string[] | null;
  },
): Promise<{ wordsDeleted: number; wordsCreated: number; antiDeleted: number; antiCreated: number }> {
  const wordsNormalized = normalize(payload.wordsWeAvoid);
  const antiNormalized = normalize(payload.antiPatterns);
  // Stem-expansie alleen op single-words. antiPatterns zijn doorgaans phrases
  // ("jouw droomvloerluik") waarbij stem-expansie false-positives geeft —
  // daar blijft 1 input = 1 rule.
  const wordsExpanded = expandWordsToPatterns(wordsNormalized);

  // Delete both auto-source streams in parallel
  const [wordsDelete, antiDelete] = await Promise.all([
    prisma.brandRule.deleteMany({
      where: { workspaceId, source: SOURCE_VOICEGUIDE_WORDS },
    }),
    prisma.brandRule.deleteMany({
      where: { workspaceId, source: SOURCE_VOICEGUIDE_ANTI },
    }),
  ]);

  // Recreate rules
  const [wordsCreate, antiCreate] = await Promise.all([
    wordsExpanded.length > 0
      ? prisma.brandRule.createMany({
          data: wordsExpanded.map((word) => ({
            workspaceId,
            ruleType: 'FORBIDDEN_WORD' as const,
            pattern: word,
            patternIsRegex: false,
            message: `Avoid "${word}" — listed in Brand Voiceguide.wordsWeAvoid.`,
            severity: 'warning',
            contentTypeFilter: [],
            isActive: true,
            source: SOURCE_VOICEGUIDE_WORDS,
          })),
        })
      : Promise.resolve({ count: 0 }),
    antiNormalized.length > 0
      ? prisma.brandRule.createMany({
          data: antiNormalized.map((phrase) => ({
            workspaceId,
            ruleType: 'FORBIDDEN_WORD' as const,
            pattern: phrase,
            patternIsRegex: false,
            message: `Anti-pattern — never use "${phrase}" (Brand Voiceguide).`,
            severity: 'error',
            contentTypeFilter: [],
            isActive: true,
            source: SOURCE_VOICEGUIDE_ANTI,
          })),
        })
      : Promise.resolve({ count: 0 }),
  ]);

  return {
    wordsDeleted: wordsDelete.count,
    wordsCreated: wordsCreate.count,
    antiDeleted: antiDelete.count,
    antiCreated: antiCreate.count,
  };
}

/**
 * Unified entry point that resolves the correct source for a workspace.
 *
 * - If BrandVoiceguide exists: sync from voiceguide and clear legacy rules.
 *   Voiceguide is single source of truth (matches getBrandContext() priority).
 * - Otherwise: leave legacy rules in place (set by personality framework PATCH).
 *
 * Use this when you want to refresh rules without knowing which source is active —
 * e.g. from a workspace-level admin action or after the migration script runs.
 */
export async function syncWorkspaceBrandRules(workspaceId: string): Promise<{
  source: 'voiceguide' | 'legacy' | 'none';
  changes: Record<string, number>;
}> {
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { wordsWeAvoid: true, antiPatterns: true },
  });

  if (voiceguide) {
    // Drop legacy rules — voiceguide is the source of truth now
    const legacyDelete = await prisma.brandRule.deleteMany({
      where: { workspaceId, source: SOURCE_LEGACY },
    });

    const result = await syncVoiceguideToRules(workspaceId, {
      wordsWeAvoid: voiceguide.wordsWeAvoid,
      antiPatterns: voiceguide.antiPatterns,
    });

    return {
      source: 'voiceguide',
      changes: { legacyDeleted: legacyDelete.count, ...result },
    };
  }

  return { source: 'none', changes: {} };
}

/**
 * Get-all rules for a workspace (active only, sorted by createdAt desc).
 * Convenience wrapper for API endpoints.
 */
export async function listBrandRules(workspaceId: string, opts?: { activeOnly?: boolean }) {
  return prisma.brandRule.findMany({
    where: {
      workspaceId,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}
