// =============================================================
// Diff engine — produceert CompetitorActivity-events uit
// twee opeenvolgende snapshot-states + workflow-context.
//
// Pure functie zonder DB-side-effects: input → output. De
// refresh-route persisteert het resultaat als CompetitorActivity-
// rijen in dezelfde transactie als de snapshot-write.
//
// MVP scope (Fase 1, 7 rules):
//   1. TAGLINE_CHANGED       — string normalisatie-diff
//   2. VALUE_PROP_CHANGED    — string normalisatie-diff
//   3. PRICING_CHANGED       — model OR significant details-diff
//   4. NEW_PRODUCT           — set-diff op mainOfferings (added)
//   5. PRODUCT_REMOVED       — set-diff op mainOfferings (removed)
//   6. STATUS_CHANGED        — workflow event (snapshot-onafhankelijk)
//   7. TIER_CHANGED          — workflow event (snapshot-onafhankelijk)
//
// Async wrapper:
//   `computeDiffWithClassifier` — concat deterministische events met
//   AI-pattern-events (CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED)
//   via een geïnjecteerde `ClassifierFn`. Wordt vóór de TX-start
//   aangeroepen zodat de Anthropic call nooit binnen `prisma.$transaction`
//   valt.
//
// Niet hier (vervolg-tasks):
//   - VISUAL_REBRAND (vereist visual-signaal capture)
//   - FUNDING_EVENT / LEADERSHIP_CHANGE (vereisen externe data-sources)
//   - NEW_FORMAT_EMERGING (depend op competitor-content-item-discovery)
//   - Content-item discovery events (NEW_BLOG_POST, NEW_PRESS_RELEASE)
// =============================================================
import type {
  CanonicalExtracted,
  ClassifierFn,
  DetectedActivity,
  ManualEventContext,
} from './types';

// ─── Helpers ────────────────────────────────────────────

/**
 * Normaliseer voor diff-vergelijking: trim + collapse whitespace.
 * Géén lowercasing — case-changes ("ACME" → "Acme") zijn echte content
 * events die zichtbaar moeten worden. Dit moet in lockstep blijven met
 * snapshot-hash.ts:normalizeString — anders krijg je hash-flips zonder
 * diff-events of vice versa.
 */
function normalize(value: string | null | undefined): string {
  if (value == null) return '';
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeSet(values: string[] | null | undefined): Map<string, string> {
  // Map van token → original-cased value; behoudt origineel voor weergave
  // in diff-payload.added/.removed terwijl set-membership case-insensitive is.
  const out = new Map<string, string>();
  if (!values) return out;
  for (const raw of values) {
    const trimmed = normalize(raw);
    if (trimmed.length === 0) continue;
    const token = trimmed.toLowerCase();
    if (!out.has(token)) out.set(token, trimmed);
  }
  return out;
}

function diffSet(prev: Map<string, string>, next: Map<string, string>): {
  added: string[];
  removed: string[];
} {
  const added: string[] = [];
  const removed: string[] = [];
  for (const [token, original] of next) if (!prev.has(token)) added.push(original);
  for (const [token, original] of prev) if (!next.has(token)) removed.push(original);
  return { added: added.sort(), removed: removed.sort() };
}

/**
 * Jaccard distance over genormaliseerde lowercase woord-tokens.
 * Symmetrisch en positie-onafhankelijk — een typo-fix in een lange
 * pricingDetails geeft een lage ratio, een herschreven blok geeft
 * een hoge ratio. ≥ 0.30 → MAJOR detail-edit.
 *
 * Min-length guard: bij erg korte pricingDetails (totaal <5 unieke
 * woorden) is elke single-token wijziging > 0.30 ratio. Voor zo
 * korte tekst leunen we volledig op `pricingModel`-signaal en
 * geven we ratio 0 terug om false-positive MAJOR-events te voorkomen.
 */
function detailsDiffRatio(prev: string, next: string): number {
  const prevWords = new Set(
    normalize(prev).toLowerCase().split(' ').filter((w) => w.length > 0),
  );
  const nextWords = new Set(
    normalize(next).toLowerCase().split(' ').filter((w) => w.length > 0),
  );
  if (prevWords.size === 0 && nextWords.size === 0) return 0;
  let intersection = 0;
  for (const w of prevWords) if (nextWords.has(w)) intersection++;
  const unionSize = prevWords.size + nextWords.size - intersection;
  if (unionSize === 0) return 0;
  if (unionSize < 5) return 0; // te kort voor zinvolle Jaccard-signaal
  return 1 - intersection / unionSize;
}

// ─── Diff entry-points ──────────────────────────────────

/**
 * Vergelijk twee snapshots + workflow-state, produceer events.
 * `prev = null` betekent: dit is de eerste snapshot, geen content-
 * diff events. Workflow-events draaien wél (status/tier kunnen al
 * gemuteerd zijn in dezelfde refresh-call).
 */
export function computeDiff(
  prev: CanonicalExtracted | null,
  next: CanonicalExtracted,
  ctx: ManualEventContext,
): DetectedActivity[] {
  const events: DetectedActivity[] = [];

  if (prev) {
    pushTaglineChange(prev, next, events);
    pushValuePropChange(prev, next, events);
    pushPricingChange(prev, next, events);
    pushOfferingChanges(prev, next, events);
  }

  pushWorkflowChanges(ctx, events);

  return events;
}

// ─── Rule 1: TAGLINE_CHANGED ────────────────────────────

function pushTaglineChange(
  prev: CanonicalExtracted,
  next: CanonicalExtracted,
  out: DetectedActivity[],
): void {
  if (normalize(prev.tagline) === normalize(next.tagline)) return;
  out.push({
    type: 'TAGLINE_CHANGED',
    severity: 'NOTABLE',
    diffPayload: {
      version: 1,
      kind: 'field-change',
      field: 'tagline',
      before: prev.tagline,
      after: next.tagline,
    },
    summary: `Tagline gewijzigd: "${prev.tagline ?? '(leeg)'}" → "${next.tagline ?? '(leeg)'}"`,
    detectionMethod: 'hash-diff',
    confidence: null,
  });
}

// ─── Rule 2: VALUE_PROP_CHANGED ─────────────────────────

function pushValuePropChange(
  prev: CanonicalExtracted,
  next: CanonicalExtracted,
  out: DetectedActivity[],
): void {
  if (normalize(prev.valueProposition) === normalize(next.valueProposition)) return;
  out.push({
    type: 'VALUE_PROP_CHANGED',
    severity: 'NOTABLE',
    diffPayload: {
      version: 1,
      kind: 'field-change',
      field: 'valueProposition',
      before: prev.valueProposition,
      after: next.valueProposition,
    },
    summary: 'Value proposition is herschreven',
    detectionMethod: 'hash-diff',
    confidence: null,
  });
}

// ─── Rule 3: PRICING_CHANGED ────────────────────────────

function pushPricingChange(
  prev: CanonicalExtracted,
  next: CanonicalExtracted,
  out: DetectedActivity[],
): void {
  const modelChanged = normalize(prev.pricingModel) !== normalize(next.pricingModel);
  const ratio = detailsDiffRatio(
    normalize(prev.pricingDetails),
    normalize(next.pricingDetails),
  );
  const detailsSignificant = ratio >= 0.3;

  if (!modelChanged && !detailsSignificant) return;

  out.push({
    type: 'PRICING_CHANGED',
    severity: 'MAJOR',
    diffPayload: {
      version: 1,
      kind: 'pricing-change',
      modelBefore: prev.pricingModel,
      modelAfter: next.pricingModel,
      detailsBefore: prev.pricingDetails,
      detailsAfter: next.pricingDetails,
      detailsSignificant,
    },
    summary: modelChanged
      ? `Pricing-model gewijzigd: ${prev.pricingModel ?? '(onbekend)'} → ${next.pricingModel ?? '(onbekend)'}`
      : 'Pricing-details substantieel herschreven',
    detectionMethod: 'hash-diff',
    confidence: null,
  });
}

// ─── Rules 4 + 5: NEW_PRODUCT / PRODUCT_REMOVED ─────────

function pushOfferingChanges(
  prev: CanonicalExtracted,
  next: CanonicalExtracted,
  out: DetectedActivity[],
): void {
  const { added, removed } = diffSet(
    normalizeSet(prev.mainOfferings),
    normalizeSet(next.mainOfferings),
  );

  if (added.length > 0) {
    out.push({
      type: 'NEW_PRODUCT',
      severity: 'NOTABLE',
      diffPayload: {
        version: 1,
        kind: 'list-change',
        field: 'mainOfferings',
        added,
        removed: [],
      },
      summary:
        added.length === 1
          ? `Nieuw aanbod: ${added[0]}`
          : `${added.length} nieuwe aanbod-items toegevoegd`,
      detectionMethod: 'hash-diff',
      confidence: null,
    });
  }

  if (removed.length > 0) {
    out.push({
      type: 'PRODUCT_REMOVED',
      severity: 'NOTABLE',
      diffPayload: {
        version: 1,
        kind: 'list-change',
        field: 'mainOfferings',
        added: [],
        removed,
      },
      summary:
        removed.length === 1
          ? `Aanbod verwijderd: ${removed[0]}`
          : `${removed.length} aanbod-items verwijderd`,
      detectionMethod: 'hash-diff',
      confidence: null,
    });
  }
}

// ─── Rules 6 + 7: STATUS_CHANGED / TIER_CHANGED ─────────

function pushWorkflowChanges(
  ctx: ManualEventContext,
  out: DetectedActivity[],
): void {
  const before = ctx.workflowBefore;
  const after = ctx.workflowAfter;
  if (!before) return; // Eerste snapshot — geen workflow-delta.

  if (before.status !== after.status) {
    out.push({
      type: 'STATUS_CHANGED',
      severity: 'INFO',
      diffPayload: {
        version: 1,
        kind: 'workflow-change',
        field: 'status',
        before: before.status,
        after: after.status,
      },
      summary: `Status: ${before.status} → ${after.status}`,
      detectionMethod: 'manual',
      confidence: null,
    });
  }

  if (before.tier !== after.tier) {
    out.push({
      type: 'TIER_CHANGED',
      severity: 'INFO',
      diffPayload: {
        version: 1,
        kind: 'workflow-change',
        field: 'tier',
        before: before.tier,
        after: after.tier,
      },
      summary: `Tier: ${before.tier} → ${after.tier}`,
      detectionMethod: 'manual',
      confidence: null,
    });
  }
}

// ─── Async wrapper met optionele AI-classifier ──────────

/**
 * Async wrapper rond `computeDiff` die optioneel een AI-classifier
 * uitvoert en de resulterende pattern-events appendert aan de
 * deterministische output.
 *
 * Wordt aangeroepen in refresh-route VÓÓR `prisma.$transaction` —
 * resultaat gaat als `precomputedDetected` door naar dual-write zodat
 * de async classifier-call niet binnen een DB-transactie valt.
 *
 * Graceful: bij classifier-error wordt de error gelogd en wordt
 * alleen de deterministische output teruggegeven (refresh blijft werken).
 */
export async function computeDiffWithClassifier(
  prev: CanonicalExtracted | null,
  next: CanonicalExtracted,
  ctx: ManualEventContext,
  opts?: { classifier?: ClassifierFn; competitorId?: string },
): Promise<DetectedActivity[]> {
  const deterministic = computeDiff(prev, next, ctx);

  if (!opts?.classifier) return deterministic;

  let classified: DetectedActivity[] = [];
  try {
    classified = await opts.classifier(prev, next);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[competitors/diff-engine] classifier threw for competitor ${opts.competitorId ?? 'unknown'}: ${message}`,
    );
  }

  return [...deterministic, ...classified];
}
