// =============================================================
// Competitor AI pattern-event classifier
//
// Detecteert CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED
// bovenop de deterministische diff-rules. Wordt vóór de TX-start
// aangeroepen in refresh-route en produceert events die als
// `precomputedDetected` doorgegeven worden aan dual-write — zodat
// een 1-2s Anthropic call nooit binnen `prisma.$transaction` valt.
//
// Inline Jaccard pre-filter skipt AI-call wanneer prev/next te dicht
// bij elkaar liggen (cost-saver: bespaart ~33% calls op NONE-cases
// per A1-audit).
//
// Zie:
// - scripts/probes/competitor-classifier-events-accuracy.ts (A1 96,7%)
// - docs/audits/2026-05-08-competitor-classifier-events-accuracy.md
// - tasks/competitor-ai-event-classifier.md
// =============================================================
import type { ActivitySeverity } from '@prisma/client';
import {
  createStructuredCompletion,
  type AICallTracking,
} from '@/lib/ai/exploration/ai-caller';
import type {
  CanonicalExtracted,
  DetectedActivity,
  PatternChangePayload,
} from './types';

// ─── Constants ─────────────────────────────────────────────

// Hardcoded model per gebruiker-keuze 2026-05-19 (sessie-log): MVP skipt
// feature-models registry entry. Bij model-bump ook probe-script bijwerken
// (`scripts/probes/competitor-classifier-events-accuracy.ts`).
const MODEL = 'claude-haiku-4-5-20251001';

// Lager dan Anthropic-default (1.0) voor consistente classifier-output.
// A1-probe draaide met default 1.0 en haalde 96,7%; lagere temperature
// = lagere variance, dus zou ≥96,7% moeten geven.
const TEMPERATURE = 0.3;

// Hard 5s timeout per task-spec acceptance — Haiku doet typisch 1-2s.
// Bij timeout: wrapper catched + returnt deterministic-only events.
const TIMEOUT_MS = 5000;

const MAX_INPUT_CHARS_PER_FIELD = 2000;
const MAX_INPUT_CHARS_PER_LIST_ITEM = 200;
const MAX_OUTPUT_TOKENS = 300;

// Pre-filter: CATEGORY_REPOSITIONING triggert AI-call als ≥ 2/3 van
// {valueProposition, targetAudience, differentiators} ≥ 50% Jaccard-distance
// verschillen. Lager → cosmetic noise; hoger → echte herpositionering.
// mainOfferings bewust uit pre-filter: pure offering-uitbreiding is vaak
// productie-event (NEW_PRODUCT) en geen category-shift.
const CATEGORY_FIELD_JACCARD_THRESHOLD = 0.5;
const CATEGORY_MIN_FIELDS_CHANGED = 2;

// TARGET_AUDIENCE_CHANGED triggert AI-call op enkel targetAudience-veld
// ≥ 30% verschil. Lager dan CATEGORY-drempel omdat audience-shift vaak
// alleen in dit veld zichtbaar is.
const AUDIENCE_JACCARD_THRESHOLD = 0.3;

// Confidence-prefix in summary bij below-threshold. GEEN severity-downgrade
// in MVP — A1-audit toonde confidence-spread 0,92-0,98 (te smal voor zinvol
// thresholding). Re-evaluate post-launch na 30d productie-data.
const LOW_CONFIDENCE_THRESHOLD = 0.7;

type SupportedEventType = 'CATEGORY_REPOSITIONING' | 'TARGET_AUDIENCE_CHANGED';

const SEVERITY_MAP: Record<SupportedEventType, ActivitySeverity> = {
  CATEGORY_REPOSITIONING: 'MAJOR',
  TARGET_AUDIENCE_CHANGED: 'NOTABLE',
};

// SYSTEM_PROMPT is direct overgenomen uit de A1-probe (96,7% accuracy
// over 30 synthetische paren). De `CRITICAL: respond with ONLY valid JSON`
// prefix is verplicht — zonder die clause kreeg de probe 33% parse-errors.
const SYSTEM_PROMPT = `You analyze pattern-level strategy shifts between two snapshots of a competitor's positioning.

Detect ONLY these two pattern-events:

1. **CATEGORY_REPOSITIONING** — fundamental shift in WHAT the company does. The category, mechanism, or market itself changes. Examples:
   - "CRM" → "AI sales platform"
   - "design tool" → "creative OS"
   - "email tool" → "customer engagement platform"
   - "analytics tool" → "customer data platform"
   Signals: mainOfferings expanded substantially with new categories, valueProposition uses fundamentally different vocabulary, multiple differentiators reflect new capabilities.

2. **TARGET_AUDIENCE_CHANGED** — shift in WHO the company serves while staying in the same category. Examples:
   - SMB → Enterprise (same tool, different segment)
   - freelancers → small business owners
   - designers → marketers
   - tech industry → healthcare
   - North America → Europe
   Signals: targetAudience text describes a meaningfully different group, mainOfferings stays roughly the same category.

DO NOT flag:
- Cosmetic wording changes ("easy" → "simple", artikel toevoegingen, synoniemen)
- Order changes in arrays
- Punctuation/casing tweaks
- Tagline-style reformulations of the same value prop
- Detail additions that don't change the underlying meaning

CRITICAL: Respond with ONLY valid JSON, no preamble, no markdown, no explanation outside the JSON. Schema:
{
  "events": [
    {"type": "CATEGORY_REPOSITIONING" | "TARGET_AUDIENCE_CHANGED", "confidence": 0.0-1.0, "rationale": "brief reason"}
  ]
}

If no pattern-event applies, you MUST return EXACTLY: {"events": []}
Never return free-form text. Always JSON. At most one event per type per call.`;

// ─── Internal types ───────────────────────────────────────

interface ClassifierEvent {
  type: SupportedEventType;
  confidence: number;
  rationale: string;
}

interface ClassifierOutput {
  events: ClassifierEvent[];
}

// ─── Helpers ──────────────────────────────────────────────

function truncate(value: string | null | undefined, max = MAX_INPUT_CHARS_PER_FIELD): string {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function tokenize(text: string): Set<string> {
  // Min-length 2: behoudt tech-acroniemen ("AI", "ML", "OS", "EU", "B2B") die
  // category-signaal dragen, maar filtert single-letter ruis ("a", "i"). Zonder
  // dit zou een AI/ML-pivot ondetecteerbaar zijn voor de Jaccard pre-filter.
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}

function jaccardDistance(a: string | null, b: string | null): number {
  const ta = tokenize(a ?? '');
  const tb = tokenize(b ?? '');
  if (ta.size === 0 && tb.size === 0) return 0;
  const intersect = new Set([...ta].filter((t) => tb.has(t)));
  const union = new Set([...ta, ...tb]);
  return 1 - intersect.size / union.size;
}

/**
 * Pre-filter heuristic. Skipt AI-call wanneer prev/next te weinig
 * tekstuele beweging hebben om pattern-events te rechtvaardigen.
 */
function shouldRunClassifier(prev: CanonicalExtracted, next: CanonicalExtracted): boolean {
  const valuePropDistance = jaccardDistance(prev.valueProposition, next.valueProposition);
  const audienceDistance = jaccardDistance(prev.targetAudience, next.targetAudience);
  const differentiatorsDistance = jaccardDistance(
    prev.differentiators.join(' '),
    next.differentiators.join(' '),
  );

  const categoryFieldHits = [valuePropDistance, audienceDistance, differentiatorsDistance].filter(
    (d) => d >= CATEGORY_FIELD_JACCARD_THRESHOLD,
  ).length;

  if (categoryFieldHits >= CATEGORY_MIN_FIELDS_CHANGED) return true;
  if (audienceDistance >= AUDIENCE_JACCARD_THRESHOLD) return true;
  return false;
}

function buildUserPrompt(prev: CanonicalExtracted, next: CanonicalExtracted): string {
  const truncList = (items: string[]): string =>
    JSON.stringify(items.map((item) => truncate(item, MAX_INPUT_CHARS_PER_LIST_ITEM)));

  return `Analyze this prev/next snapshot pair:

PREV:
- valueProposition: ${truncate(prev.valueProposition)}
- targetAudience: ${truncate(prev.targetAudience)}
- differentiators: ${truncList(prev.differentiators)}
- mainOfferings: ${truncList(prev.mainOfferings)}

NEXT:
- valueProposition: ${truncate(next.valueProposition)}
- targetAudience: ${truncate(next.targetAudience)}
- differentiators: ${truncList(next.differentiators)}
- mainOfferings: ${truncList(next.mainOfferings)}

What pattern-events do you detect?`;
}

function determineDriverFields(eventType: SupportedEventType): Array<keyof CanonicalExtracted> {
  if (eventType === 'TARGET_AUDIENCE_CHANGED') return ['targetAudience'];
  return ['valueProposition', 'targetAudience', 'differentiators', 'mainOfferings'];
}

function buildSummary(event: ClassifierEvent): string {
  return event.confidence < LOW_CONFIDENCE_THRESHOLD
    ? `[low-confidence] ${event.rationale}`
    : event.rationale;
}

function isSupportedEvent(value: unknown): value is ClassifierEvent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.type === 'CATEGORY_REPOSITIONING' || candidate.type === 'TARGET_AUDIENCE_CHANGED') &&
    typeof candidate.confidence === 'number' &&
    typeof candidate.rationale === 'string'
  );
}

// ─── Public API ────────────────────────────────────────────

/**
 * AI pattern-classifier voor competitor snapshot-paren.
 *
 * Returnt 0..N `DetectedActivity` events met `detectionMethod: 'ai-classified'`
 * en gevulde `confidence`. Bij API-error → log + return `[]` (refresh-route
 * blijft werken op deterministische events alleen).
 *
 * @param prev - Vorige canonical snapshot, of null bij eerste refresh ever
 * @param next - Nieuwe canonical snapshot
 * @param ctx - Optionele context voor cost-tracking via AiCallTrace
 */
export async function classifyPatternEvents(
  prev: CanonicalExtracted | null,
  next: CanonicalExtracted,
  ctx?: { workspaceId: string; competitorId: string },
): Promise<DetectedActivity[]> {
  if (!prev) return [];
  if (!shouldRunClassifier(prev, next)) return [];

  const tracking: AICallTracking | undefined = ctx
    ? {
        workspaceId: ctx.workspaceId,
        parentEntityType: 'Competitor',
        parentEntityId: ctx.competitorId,
        sourceIdentifier: 'src/lib/competitors/ai-classifier.ts:classifyPatternEvents',
      }
    : undefined;

  let output: ClassifierOutput;
  try {
    output = await createStructuredCompletion<ClassifierOutput>(
      'anthropic',
      MODEL,
      SYSTEM_PROMPT,
      buildUserPrompt(prev, next),
      { temperature: TEMPERATURE, maxTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS },
      tracking,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[competitor-ai-classifier] call failed for competitor ${ctx?.competitorId ?? 'unknown'}: ${message}`,
    );
    return [];
  }

  if (!output?.events || !Array.isArray(output.events)) {
    // Defensieve schema-check — createStructuredCompletion belooft `T` bij
    // success, maar Anthropic-response kan schema-drift hebben (prompt-bug
    // of model-update). Log voor ops-zichtbaarheid ipv silent return.
    console.warn(
      `[competitor-ai-classifier] unexpected output shape for competitor ${ctx?.competitorId ?? 'unknown'} — missing/invalid events array`,
    );
    return [];
  }

  return output.events.filter(isSupportedEvent).map<DetectedActivity>((event) => {
    const payload: PatternChangePayload = {
      version: 1,
      kind: 'pattern-change',
      fields: determineDriverFields(event.type),
      rationale: event.rationale,
    };
    return {
      type: event.type,
      severity: SEVERITY_MAP[event.type],
      diffPayload: payload,
      summary: buildSummary(event),
      detectionMethod: 'ai-classified',
      confidence: event.confidence,
    };
  });
}
