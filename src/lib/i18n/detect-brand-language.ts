// ============================================================
// Brand-language auto-detection
//
// Consolideert tekstuele content per workspace (voice-guide voice-description,
// writing-samples, brand-asset frameworkData) en runt `franc-min` om de
// dominante taal te detecteren. Output gemapt naar de ISO 639-1 codes die
// `Workspace.contentLanguage` accepteert + BCP-47 locale voor
// `BrandVoiceguide.contentLocale`.
//
// Gebruik:
//   - Backfill-script: detect → vergelijk met huidige workspace-state → optioneel update
//   - Runtime mismatch-guard: detect → console.warn bij mismatch met brand-context
//   - Geen automatische runtime-override — silent overrides zijn riskanter
//     dan een feedback-loop via user.
// ============================================================

import { franc } from 'franc-min';
import { prisma } from '@/lib/prisma';

export type DetectedLanguage = 'nl' | 'en' | 'de' | 'fr';

/** BCP-47 locales die de bestaande heuristic-resolver ondersteunt. */
export type DetectedLocale = 'nl-NL' | 'en-GB' | 'de-DE' | 'fr-FR';

export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface BrandLanguageDetection {
  /** ISO 639-1 — past direct op `Workspace.contentLanguage`. Null als geen confident detectie. */
  language: DetectedLanguage | null;
  /** BCP-47 — past op `BrandVoiceguide.contentLocale`. Null als language null. */
  locale: DetectedLocale | null;
  confidence: DetectionConfidence;
  /** Bronnen die signaal leverden (debug + audit-trail). */
  sourcesUsed: Array<{ kind: string; chars: number }>;
  /** Raw franc-score voor primary language (0-1). */
  francScore: number;
  /** Totale tekst-lengte (chars) na sample-concatenation. */
  totalChars: number;
}

/** ISO 639-3 (franc-min) → ISO 639-1 + default BCP-47. */
const ISO3_TO_LANG: Record<string, { lang: DetectedLanguage; locale: DetectedLocale }> = {
  nld: { lang: 'nl', locale: 'nl-NL' },
  eng: { lang: 'en', locale: 'en-GB' },
  deu: { lang: 'de', locale: 'de-DE' },
  fra: { lang: 'fr', locale: 'fr-FR' },
};

/** Per-source minimum char-threshold; te kort = geen signaal. */
const MIN_CHARS_PER_SOURCE = 50;
/** Totale minimum chars over alle sources voor enig signaal. */
const MIN_TOTAL_CHARS = 100;
/** Per franc-min default (10 chars); we zetten hoger voor robuuste detectie. */
const FRANC_MIN_LENGTH = 50;

/**
 * Detecteer de dominante taal van een workspace op basis van haar
 * tekstuele brand-content. Pure-async; geen DB-writes; tolerant voor
 * ontbrekende voice-guide of brand-assets.
 */
export async function detectBrandLanguage(
  workspaceId: string,
): Promise<BrandLanguageDetection> {
  const [voiceguide, brandAssets] = await Promise.all([
    prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: {
        voiceDescription: true,
        writingSamples: true,
      },
    }),
    prisma.brandAsset.findMany({
      where: { workspaceId },
      select: { content: true, frameworkData: true, name: true },
      take: 20,
    }),
  ]);

  const sourcesUsed: Array<{ kind: string; chars: number }> = [];
  const parts: string[] = [];

  // Source 1: voiceguide.voiceDescription — meestal het sterkste signaal
  if (voiceguide?.voiceDescription && voiceguide.voiceDescription.length >= MIN_CHARS_PER_SOURCE) {
    parts.push(voiceguide.voiceDescription);
    sourcesUsed.push({ kind: 'voiceguide.voiceDescription', chars: voiceguide.voiceDescription.length });
  }

  // Source 2: voiceguide.writingSamples (JSON array; pak text-veld of raw string per item)
  if (voiceguide?.writingSamples) {
    const samples = extractSampleTexts(voiceguide.writingSamples);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (s.length >= MIN_CHARS_PER_SOURCE) {
        parts.push(s);
        sourcesUsed.push({ kind: `voiceguide.writingSamples[${i}]`, chars: s.length });
      }
    }
  }

  // Source 3: brand-asset content + framework-data tekstuele velden.
  // `BrandAsset.content` is Json? (kan een gestructureerd object zijn),
  // dus we extract via dezelfde flatten-helper als frameworkData.
  for (const asset of brandAssets) {
    if (asset.content) {
      const contentText = extractFrameworkDataText(asset.content);
      if (contentText.length >= MIN_CHARS_PER_SOURCE) {
        parts.push(contentText);
        sourcesUsed.push({ kind: `brandAsset[${asset.name}].content`, chars: contentText.length });
      }
    }
    if (asset.frameworkData) {
      const fwText = extractFrameworkDataText(asset.frameworkData);
      if (fwText.length >= MIN_CHARS_PER_SOURCE) {
        parts.push(fwText);
        sourcesUsed.push({ kind: `brandAsset[${asset.name}].frameworkData`, chars: fwText.length });
      }
    }
  }

  const combined = parts.join('\n\n');
  const totalChars = combined.length;

  if (totalChars < MIN_TOTAL_CHARS) {
    return {
      language: null,
      locale: null,
      confidence: 'low',
      sourcesUsed,
      francScore: 0,
      totalChars,
    };
  }

  // franc returnt ISO 639-3; 'und' (undetermined) als geen confident match.
  const iso3 = franc(combined, { minLength: FRANC_MIN_LENGTH });
  if (iso3 === 'und' || !ISO3_TO_LANG[iso3]) {
    return {
      language: null,
      locale: null,
      confidence: 'low',
      sourcesUsed,
      francScore: 0,
      totalChars,
    };
  }

  const mapped = ISO3_TO_LANG[iso3];
  const confidence = scoreConfidence(sourcesUsed.length, totalChars);

  // Low-confidence retourneert wel een language-guess maar markeer hem
  // expliciet zodat callers kunnen besluiten niet door te schrijven.
  return {
    language: mapped.lang,
    locale: mapped.locale,
    confidence,
    sourcesUsed,
    francScore: 1, // franc-min retourneert geen score op `franc()`; gebruik francAll voor exacte score
    totalChars,
  };
}

/**
 * Confidence-band: multi-source én substantial corpus = high. Enkele
 * source met ≥150 chars = medium. Marginaal = low.
 */
function scoreConfidence(sourceCount: number, totalChars: number): DetectionConfidence {
  if (sourceCount >= 2 && totalChars >= 300) return 'high';
  if (sourceCount >= 1 && totalChars >= 150) return 'medium';
  return 'low';
}

// ─── Runtime mismatch-guard ─────────────────────────────────

interface MismatchCacheEntry {
  loggedAt: number;
}
const mismatchLogCache = new Map<string, MismatchCacheEntry>();
const MISMATCH_LOG_TTL_MS = 5 * 60 * 1000; // 5 min — niet elke generate-call spammen

/**
 * Fire-and-forget mismatch-detectie. Bij content-generatie aangeroepen om
 * te loggen wanneer de configured `Workspace.contentLanguage` afwijkt van
 * detected language uit de tekstuele brand-content.
 *
 * Geen auto-override — silent overrides zouden user-feedback loop breken.
 * 5-min cache per workspace voorkomt log-spam bij high-volume generations.
 */
export function logBrandLanguageMismatchIfAny(
  workspaceId: string,
  configuredLanguage: string | null | undefined,
): void {
  if (!workspaceId) return;
  const cached = mismatchLogCache.get(workspaceId);
  if (cached && Date.now() - cached.loggedAt < MISMATCH_LOG_TTL_MS) {
    return;
  }
  // Fire-and-forget: blokkeert generation niet, tolerant voor errors.
  void (async () => {
    try {
      const detection = await detectBrandLanguage(workspaceId);
      if (
        detection.language &&
        detection.confidence === 'high' &&
        configuredLanguage !== null &&
        detection.language !== configuredLanguage
      ) {
        console.warn(
          `[brand-language-mismatch] workspace=${workspaceId} ` +
            `configured=${configuredLanguage} detected=${detection.language} ` +
            `confidence=${detection.confidence} sources=${detection.sourcesUsed.length} ` +
            `chars=${detection.totalChars} — content wordt mogelijk in verkeerde taal gegenereerd. ` +
            `Run \`npx tsx scripts/backfill-brand-language.ts\` voor audit.`,
        );
      }
      mismatchLogCache.set(workspaceId, { loggedAt: Date.now() });
    } catch (err) {
      console.warn('[brand-language-mismatch] detection failed:', (err as Error).message);
    }
  })();
}

/**
 * Trek tekstuele samples uit `BrandVoiceguide.writingSamples` (Json).
 * Veld-shape varieert historisch: kan `string[]`, `Array<{text: string}>`,
 * of nested-object zijn. Defensief: alle string-waarden flatten.
 */
function extractSampleTexts(raw: unknown): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (typeof v === 'string') {
      out.push(v);
    } else if (Array.isArray(v)) {
      for (const item of v) visit(item);
    } else if (v && typeof v === 'object') {
      for (const val of Object.values(v as Record<string, unknown>)) visit(val);
    }
  };
  visit(raw);
  return out;
}

/**
 * Trek tekstuele content uit `BrandAsset.frameworkData` (Json). De shape
 * is per `frameworkType` verschillend — pak alle string-waarden boven
 * een minimum char-threshold (filtert key-names en ID's).
 */
function extractFrameworkDataText(raw: unknown): string {
  const parts: string[] = [];
  const MIN_FIELD_LEN = 20;
  const visit = (v: unknown) => {
    if (typeof v === 'string' && v.length >= MIN_FIELD_LEN) {
      parts.push(v);
    } else if (Array.isArray(v)) {
      for (const item of v) visit(item);
    } else if (v && typeof v === 'object') {
      for (const val of Object.values(v as Record<string, unknown>)) visit(val);
    }
  };
  visit(raw);
  return parts.join(' ');
}
