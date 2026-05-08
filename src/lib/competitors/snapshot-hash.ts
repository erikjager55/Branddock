// =============================================================
// Snapshot hash — sha256 over canonical extracted-state.
//
// Pattern-precedent: BrandstyleSnapshot.tokensHash. Stable canonical
// JSON-stringify zodat field-order in input nooit een hash-mismatch
// produceert. Empty-string normalisatie voor nullable strings, sort
// op arrays. Dit is de no-op-detection die voorkomt dat unchanged
// scrapes een nieuwe snapshot-rij schrijven.
// =============================================================
import { createHash } from 'node:crypto';

import type { CanonicalExtracted } from './types';

/** Volgorde MOET stabiel blijven over de tijd — bestaande hashes
 *  invalidaten als deze lijst wijzigt. Toevoegen alleen aan het
 *  einde, en alleen als velden in `Competitor` worden toegevoegd. */
const CANONICAL_FIELD_ORDER: Array<keyof CanonicalExtracted> = [
  'tagline',
  'valueProposition',
  'targetAudience',
  'differentiators',
  'mainOfferings',
  'pricingModel',
  'pricingDetails',
  'toneOfVoice',
  'messagingThemes',
  'visualStyleNotes',
  'strengths',
  'weaknesses',
  'socialLinks',
  'hasBlog',
  'hasCareersPage',
];

/** Trim + collapse whitespace zodat "Hello   World " en "Hello World"
 *  dezelfde hash krijgen. Behoudt unicode-letters. */
function normalizeString(value: string | null): string {
  if (value == null) return '';
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeStringArray(values: string[] | null | undefined): string[] {
  if (!values || values.length === 0) return [];
  return values
    .map((v) => normalizeString(v))
    .filter((v) => v.length > 0)
    .sort();
}

function normalizeSocialLinks(
  links: Record<string, string> | null | undefined,
): Array<[string, string]> {
  if (!links) return [];
  return Object.entries(links)
    .map(([k, v]) => [k.toLowerCase().trim(), normalizeString(v)] as [string, string])
    .filter(([, v]) => v.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Project een raw `CanonicalExtracted` op een vorm die deterministisch
 * te hashen is. Uitkomst is een tuple van [veldnaam, genormaliseerde
 * waarde] paren in vaste volgorde.
 */
export function canonicalize(input: CanonicalExtracted): unknown {
  const output: Array<[string, unknown]> = [];

  for (const field of CANONICAL_FIELD_ORDER) {
    const raw = input[field];

    switch (field) {
      case 'differentiators':
      case 'mainOfferings':
      case 'messagingThemes':
      case 'strengths':
      case 'weaknesses':
        output.push([field, normalizeStringArray(raw as string[] | null | undefined)]);
        break;
      case 'socialLinks':
        output.push([field, normalizeSocialLinks(raw as Record<string, string> | null)]);
        break;
      case 'hasBlog':
      case 'hasCareersPage':
        // Tri-state: null/true/false moeten verschillende hashes geven.
        output.push([field, raw === null || raw === undefined ? null : Boolean(raw)]);
        break;
      default:
        output.push([field, normalizeString(raw as string | null)]);
        break;
    }
  }

  return output;
}

/**
 * sha256 hex over de canonical JSON-encoding. Gebruik dit als
 * `CompetitorSnapshot.contentHash`. Bij hash-match → skip nieuwe
 * snapshot, alleen `Competitor.lastScrapedAt` updaten.
 */
export function computeContentHash(input: CanonicalExtracted): string {
  const canonical = canonicalize(input);
  const json = JSON.stringify(canonical);
  return createHash('sha256').update(json).digest('hex');
}

/**
 * sha256 hex over een ruwe scrape-payload. Lichte normalisatie
 * (whitespace) voor robuustheid tegen formatting-fluctuaties die
 * geen content-wijziging zijn. Optioneel, gebruikt als secundaire
 * scrape-stability-check naast `contentHash`.
 */
export function computeScrapeHash(scrapedHtml: string | null): string | null {
  if (!scrapedHtml) return null;
  const normalized = scrapedHtml.replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex');
}
