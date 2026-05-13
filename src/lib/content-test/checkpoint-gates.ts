// =============================================================
// Pipeline checkpoint-gates — sub-sprint #6.A.
// Per plan §3.2: 8 deterministic asserts tussen pipeline-stages.
//
// Severity-policy:
//   - block: fail-fast → SSE error-event + return (generation faalt voor user)
//   - warn: log naar AICallTrace.gateWarnings, continueer doorstroming
//
// Alle gates pure functies (geen DB, geen AI, geen I/O). Snelle eval-ladder
// op natuurlijke transitie-momenten in canvas-orchestrator zodat naden in
// data-flow vroeg gedetecteerd worden.
// =============================================================

// Note: hangt niet aan ContentFidelityScore model omdat naam-mapping
// kan verschillen (composite vs compositeScore). Gate accepteert
// genericke shape met composite-veld.

export type GateSeverity = 'block' | 'warn';

export interface GateResult {
  /** Stage-id consistent met canvas-orchestrator pipeline-stages. */
  stage:
    | 'brief-input'
    | 'context-completeness'
    | 'angle-diversity'
    | 'variant-output'
    | 'sanitization-result'
    | 'fidelity-composite'
    | 'strict-rewrite'
    | 'persistence-result';
  /** True = check passed (geen issue), false = issue gevonden. */
  pass: boolean;
  /** Severity bij failure. Geen severity wanneer pass=true. */
  severity?: GateSeverity;
  /** Specifieke reasons (≥ 1 bij failure). Lege array bij pass. */
  reasons: string[];
}

// ─── Helpers ──────────────────────────────────────────────────

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function jaccardDistance(a: string, b: string): number {
  const tokens = (s: string) => new Set(s.toLowerCase().match(/\w+/g) ?? []);
  const setA = tokens(a);
  const setB = tokens(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return 1 - intersection.size / union.size;
}

// ─── 8 Gate-functies ──────────────────────────────────────────

/**
 * Gate [1] — validateBriefInput
 * Pre-conditie: brief moet minimum-input bevatten voor zinvolle generation.
 * Block bij volledig leeg; warn bij gedeeltelijk ontbreken.
 */
export function validateBriefInput(brief: {
  objective?: string;
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
}): GateResult {
  const reasons: string[] = [];
  const hasObjective = isNonEmptyString(brief.objective);
  const hasKeyMessage = isNonEmptyString(brief.keyMessage);
  const hasTone = isNonEmptyString(brief.toneDirection);
  const hasCta = isNonEmptyString(brief.callToAction);
  const filledCount = [hasObjective, hasKeyMessage, hasTone, hasCta].filter(Boolean).length;

  // F-gate-strictness fix (audit 2026-05-13): UI markeert deze 4 fields NIET
  // als required (alleen rode-stip op contentTypeInputs zoals SEO Keyword).
  // Gate verlaagd naar warn-only zodat generation niet blokt op iets dat
  // visueel optioneel lijkt. AI heeft sowieso brand-context + persona +
  // contentTypeInputs als context, dus een leeg brief is generation-able.
  if (filledCount === 0) {
    reasons.push('Brief is volledig leeg — AI gebruikt brand-context + persona als enige direction');
    return { stage: 'brief-input', pass: false, severity: 'warn', reasons };
  }
  if (!hasObjective && !hasKeyMessage) {
    reasons.push('Geen objective EN geen keyMessage — generation kan minder gericht zijn');
  }
  if (!hasTone) reasons.push('toneDirection ontbreekt — AI gebruikt brand-voice fallback');
  if (!hasCta) reasons.push('callToAction ontbreekt — gegenereerde content krijgt geen explicit CTA');
  if (filledCount < 4) {
    return { stage: 'brief-input', pass: false, severity: 'warn', reasons };
  }
  return { stage: 'brief-input', pass: true, reasons: [] };
}

/**
 * Gate [2] — validateContextCompleteness
 * Brand-context completeness; downstream prompts hangen op brand-info.
 *
 * F2 fix (audit 2026-05-13): canvas-context laadt alleen personas/products
 * die via CampaignKnowledgeAsset aan de campaign gekoppeld zijn. Workspaces
 * met persona/product-data maar campagne zonder link kreeg false-positive
 * warn. Accepteer workspace-level fallback-counts wanneer campaign-linked
 * personas leeg zijn — gate wordt dan "workspace heeft tenminste context"
 * i.p.v. "deze specifieke campaign heeft context".
 */
export function validateContextCompleteness(stack: {
  brand?: { brandName?: string; contentLanguage?: string };
  personas?: Array<{ name?: string }>;
  products?: Array<{ name?: string }>;
  /** Optioneel: workspace-level fallback wanneer campaign-link leeg is. */
  workspacePersonaCount?: number;
  workspaceProductCount?: number;
}): GateResult {
  const reasons: string[] = [];
  if (!stack.brand?.brandName) {
    return {
      stage: 'context-completeness',
      pass: false,
      severity: 'block',
      reasons: ['stack.brand.brandName ontbreekt — generation kan niet on-brand zijn'],
    };
  }
  if (!stack.brand.contentLanguage) {
    reasons.push('stack.brand.contentLanguage ontbreekt — language-detection fallback gebruikt');
  }
  const hasPersona = (stack.personas?.length ?? 0) > 0;
  const hasProduct = (stack.products?.length ?? 0) > 0;
  const wsHasPersona = (stack.workspacePersonaCount ?? 0) > 0;
  const wsHasProduct = (stack.workspaceProductCount ?? 0) > 0;
  if (!hasPersona && !hasProduct) {
    if (!wsHasPersona && !wsHasProduct) {
      reasons.push(
        'Geen persona of product in workspace — gegenereerde content wordt generiek. Maak eerst een persona of product aan in Brand Foundation.',
      );
    } else {
      // Workspace heeft context, alleen campaign-link ontbreekt. Info-niveau,
      // niet warn — content is on-brand maar zou specifieker kunnen zijn als
      // de campaign expliciet personas linkt.
      reasons.push(
        `Workspace heeft ${stack.workspacePersonaCount ?? 0} persona(s) en ${stack.workspaceProductCount ?? 0} product(en), maar geen daarvan gelinkt aan deze campaign — content gebruikt brand-context, niet campaign-specific persona-fit`,
      );
    }
  }
  if (reasons.length > 0) {
    return { stage: 'context-completeness', pass: false, severity: 'warn', reasons };
  }
  return { stage: 'context-completeness', pass: true, reasons: [] };
}

/**
 * Gate [3] — validateAngleDiversity
 * Twee angles moeten semantisch distinct zijn (Jaccard ≥ 0.4 op approach-tekst).
 * Block bij identiek; warn bij low-distance.
 */
export function validateAngleDiversity(angles: Array<{ label?: string; approach?: string }> | null): GateResult {
  if (!angles || angles.length === 0) {
    return {
      stage: 'angle-diversity',
      pass: true,
      reasons: [],
    }; // No angles = legacy flow, geen check nodig
  }
  if (angles.length < 2) {
    return {
      stage: 'angle-diversity',
      pass: false,
      severity: 'warn',
      reasons: [`Slechts ${angles.length} angle(s) gegenereerd — verwacht 2`],
    };
  }
  const a = angles[0].approach ?? '';
  const b = angles[1].approach ?? '';
  if (!a || !b) {
    return {
      stage: 'angle-diversity',
      pass: false,
      severity: 'block',
      reasons: ['Een of beide angles heeft lege approach-tekst'],
    };
  }
  if (a === b) {
    return {
      stage: 'angle-diversity',
      pass: false,
      severity: 'block',
      reasons: ['Twee angles hebben identieke approach — variant-diversity faalt'],
    };
  }
  const distance = jaccardDistance(a, b);
  if (distance < 0.30) {
    return {
      stage: 'angle-diversity',
      pass: false,
      severity: 'warn',
      reasons: [`Angle-diversity ${(distance * 100).toFixed(0)}% (verwacht ≥ 30%) — varianten worden mogelijk te similar`],
    };
  }
  return { stage: 'angle-diversity', pass: true, reasons: [] };
}

/**
 * Gate [4] — validateVariantOutput
 * Variant heeft minimum-content + matched expected groupType. Pre-sanitize check.
 */
export function validateVariantOutput(
  variant: { content?: string; tone?: string; cta?: string },
  groupType: string,
): GateResult {
  const reasons: string[] = [];
  if (!isNonEmptyString(variant.content)) {
    return {
      stage: 'variant-output',
      pass: false,
      severity: 'block',
      reasons: ['variant.content is leeg of ontbreekt'],
    };
  }
  const length = variant.content.length;
  // F25 (audit 2026-05-13): per-group minimum-thresholds i.p.v. hardcoded 20.
  // Korte CTAs ("Bestel nu" 9 chars, "Plan een afspraak" 17) zijn legitiem
  // Nederlands en faalden voorheen op universele 20-cap met BLOCK-severity.
  // Severity verlaagd van BLOCK → WARN voor length-only-failures; alleen leeg/
  // ontbrekend blijft BLOCK (zie eerdere isNonEmptyString-check hierboven).
  const PLAIN_GROUPS = new Set(['headline', 'subject', 'preheader', 'cta']);
  const MIN_LENGTHS: Record<string, number> = {
    cta: 5, // "Bestel" = 6
    headline: 10,
    subject: 10,
    preheader: 10,
    body: 50,
  };
  const minForGroup = MIN_LENGTHS[groupType] ?? 20;
  if (length < minForGroup) {
    return {
      stage: 'variant-output',
      pass: false,
      severity: 'warn',
      reasons: [`variant.content is ${length} chars — onder minimum-threshold (${minForGroup}) voor groep "${groupType}"`],
    };
  }
  // Plain-groups: enforce ≤ 300 chars to catch runaway model output
  if (PLAIN_GROUPS.has(groupType) && length > 300) {
    reasons.push(`${groupType} is ${length} chars — verwacht ≤ 300 voor plain-group`);
  }
  // Body-group: warn als < 100 (overlapt 50 hierboven, maar past richtlijn aan)
  if (groupType === 'body' && length < 100) {
    reasons.push(`Body-group ${length} chars — onverwacht kort voor body-content`);
  }
  if (reasons.length > 0) {
    return { stage: 'variant-output', pass: false, severity: 'warn', reasons };
  }
  return { stage: 'variant-output', pass: true, reasons: [] };
}

/**
 * Gate [5] — validateSanitizationResult
 * Na sanitize moet content nog steeds substantieel zijn + geen leakage.
 */
export function validateSanitizationResult(
  preContent: string,
  postContent: string,
): GateResult {
  const reasons: string[] = [];
  const preLength = preContent.length;
  const postLength = postContent.length;
  if (postLength === 0) {
    return {
      stage: 'sanitization-result',
      pass: false,
      severity: 'block',
      reasons: ['Sanitize stripped alle content (post-length = 0)'],
    };
  }
  // > 60% length-reduction = waarschijnlijk over-aggressive sanitize
  if (preLength > 50 && postLength < preLength * 0.4) {
    reasons.push(
      `Sanitize reduceerde content van ${preLength} naar ${postLength} chars (${Math.round((1 - postLength / preLength) * 100)}% verwijderd)`,
    );
  }
  // Lekkende markdown-fences in post-content = sanitize miste iets
  if (/```[\s\S]*```/.test(postContent)) {
    reasons.push('Markdown code-fences in post-sanitize content — sanitize miste fence-block');
  }
  if (reasons.length > 0) {
    return { stage: 'sanitization-result', pass: false, severity: 'warn', reasons };
  }
  return { stage: 'sanitization-result', pass: true, reasons: [] };
}

/**
 * Gate [6] — validateFidelityComposite
 * F-VAL composite score >= workspace-threshold. Block onder threshold;
 * Always-pass voor non-STRICT mode (UI toont al threshold-bar).
 */
export function validateFidelityComposite(
  score: { composite: number } | null,
  threshold: number,
  strictMode: boolean,
): GateResult {
  if (!score) {
    return {
      stage: 'fidelity-composite',
      pass: false,
      severity: 'warn',
      reasons: ['F-VAL score niet gegenereerd — composite-validation skip'],
    };
  }
  if (score.composite < threshold) {
    return {
      stage: 'fidelity-composite',
      pass: false,
      severity: strictMode ? 'block' : 'warn',
      reasons: [
        `F-VAL composite ${score.composite.toFixed(1)} onder threshold ${threshold}${strictMode ? ' (STRICT mode → block)' : ' (non-strict → warn, user kan publish-overrule)'}`,
      ],
    };
  }
  return { stage: 'fidelity-composite', pass: true, reasons: [] };
}

/**
 * Gate [7] — validateStrictRewrite
 * Bij STRICT-mode rewrite: post-rewrite score moet > pre-rewrite zijn.
 * Anders heeft de rewrite niet geholpen.
 */
export function validateStrictRewrite(
  preScore: number,
  postScore: number,
): GateResult {
  const delta = postScore - preScore;
  if (delta < 0) {
    return {
      stage: 'strict-rewrite',
      pass: false,
      severity: 'block',
      reasons: [`STRICT rewrite verlaagde score van ${preScore.toFixed(1)} naar ${postScore.toFixed(1)} (Δ${delta.toFixed(1)})`],
    };
  }
  if (delta < 2) {
    return {
      stage: 'strict-rewrite',
      pass: false,
      severity: 'warn',
      reasons: [`STRICT rewrite-delta marginaal: ${preScore.toFixed(1)} → ${postScore.toFixed(1)} (Δ${delta.toFixed(1)})`],
    };
  }
  return { stage: 'strict-rewrite', pass: true, reasons: [] };
}

/**
 * Gate [8] — validatePersistenceResult
 * Na DB-write moet deliverable id + variant-count consistent zijn.
 */
export function validatePersistenceResult(result: {
  deliverableId?: string | null;
  componentCount?: number;
  expectedComponentCount?: number;
}): GateResult {
  const reasons: string[] = [];
  if (!result.deliverableId) {
    return {
      stage: 'persistence-result',
      pass: false,
      severity: 'block',
      reasons: ['Persistence returnde geen deliverableId'],
    };
  }
  if (
    typeof result.componentCount === 'number' &&
    typeof result.expectedComponentCount === 'number' &&
    result.componentCount !== result.expectedComponentCount
  ) {
    reasons.push(
      `Component-count mismatch: ${result.componentCount} persisted vs ${result.expectedComponentCount} expected`,
    );
  }
  if (reasons.length > 0) {
    return { stage: 'persistence-result', pass: false, severity: 'warn', reasons };
  }
  return { stage: 'persistence-result', pass: true, reasons: [] };
}

/**
 * Aggregator: run één gate + collect result voor batching naar
 * AICallTrace.gateWarnings of SSE error-event.
 */
export interface GateBatchResult {
  passed: boolean;
  blockingFailures: GateResult[];
  warnings: GateResult[];
}

export function batchGateResults(results: GateResult[]): GateBatchResult {
  const blockingFailures = results.filter((r) => !r.pass && r.severity === 'block');
  const warnings = results.filter((r) => !r.pass && r.severity === 'warn');
  return {
    passed: blockingFailures.length === 0,
    blockingFailures,
    warnings,
  };
}
