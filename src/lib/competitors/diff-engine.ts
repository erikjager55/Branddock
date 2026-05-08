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
// Niet hier (vervolg-tasks):
//   - AI-classified events (NEW_FORMAT_EMERGING, CATEGORY_REPOSITIONING,
//     VISUAL_REBRAND, FUNDING_EVENT, LEADERSHIP_CHANGE)
//   - Content-item discovery events (NEW_BLOG_POST, NEW_PRESS_RELEASE)
// =============================================================
import type {
  CanonicalExtracted,
  DetectedActivity,
  ManualEventContext,
} from './types';

// ─── Helpers ────────────────────────────────────────────

function normalize(value: string | null | undefined): string {
  if (value == null) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSet(values: string[] | null | undefined): Set<string> {
  if (!values) return new Set();
  return new Set(values.map((v) => normalize(v)).filter((v) => v.length > 0));
}

function diffSet(prev: Set<string>, next: Set<string>): {
  added: string[];
  removed: string[];
} {
  const added: string[] = [];
  const removed: string[] = [];
  for (const item of next) if (!prev.has(item)) added.push(item);
  for (const item of prev) if (!next.has(item)) removed.push(item);
  return { added: added.sort(), removed: removed.sort() };
}

/** Char-distance ratio. >= 0.30 → significant edit; minder → cosmetisch. */
function detailsDiffRatio(prev: string, next: string): number {
  if (prev === next) return 0;
  if (prev.length === 0 && next.length === 0) return 0;
  const longer = Math.max(prev.length, next.length);
  if (longer === 0) return 0;
  // Simple symmetric distance proxy: |Δlen| + first-position-of-divergence.
  // Goedkoper dan Levenshtein voor MVP — bij significant rewrite is
  // length-delta of early divergence vrijwel altijd > 30%.
  const lengthDelta = Math.abs(prev.length - next.length);
  let divergeAt = 0;
  const minLen = Math.min(prev.length, next.length);
  while (divergeAt < minLen && prev[divergeAt] === next[divergeAt]) divergeAt++;
  const distance = lengthDelta + (minLen - divergeAt);
  return Math.min(1, distance / longer);
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
