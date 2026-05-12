// =============================================================
// Content-test types — Layer 1 property-evals foundation
// Sub-sprint #5.A van content-test-improvement-plan.md
// =============================================================

/**
 * Single property-eval result. Deterministisch + snel (< 10ms per check).
 * 15 checks runnen in cumulatief < 100ms per generated variant.
 */
export interface PropertyEvalResult {
  /** Stable check-identifier, e.g. "language-match" / "placeholder-detection". */
  check: PropertyEvalCheckId;
  /** True = check geslaagd (geen issue). False = issue gevonden. */
  pass: boolean;
  /**
   * Block: throw + SSE error (generation faalt voor user).
   * Warn: gelogd in AICallTrace.propertyEvalResults, generation gaat door.
   * Info: alleen telemetry, geen impact op flow.
   */
  severity: 'block' | 'warn' | 'info';
  /** Human-readable reden — toonbaar in UI. */
  reason: string;
  /** Citaat uit content waar issue zit (snippet rond character-position). */
  evidence?: string;
  /** Optionele character-positie in content voor inline-highlighting. */
  position?: number;
}

/**
 * Alle 15 check-identifiers. Uitbreiding post-pilot via deze union.
 */
export type PropertyEvalCheckId =
  | 'schema-valid'
  | 'language-match'
  | 'length-bounds'
  | 'banned-phrase'
  | 'brand-name-capitalization'
  | 'placeholder-detection'
  | 'pii-safety'
  | 'heading-hierarchy'
  | 'cta-presence'
  | 'cta-quality'
  | 'meta-description-compliance'
  | 'claim-substantiation'
  | 'hallucination-flag'
  | 'sentence-case-headings'
  | 'minimum-heading-count'
  | 'markdown-leakage'
  | 'language-directive-consistency'
  | 'duplicate-content';

/**
 * Context-bundle dat property-evals nodig hebben om beslissingen te maken.
 * Bundeling reduceert function-signature noise + maakt evals composable.
 */
export interface PropertyEvalContext {
  /** ISO 639-1 language code voor verwachte content-taal. */
  expectedLanguage: 'nl' | 'en' | 'de' | string;
  /** Workspace brand-naam (correct gecapitaliseerd) voor mention-check. */
  brandName: string;
  /** Content-type identifier voor type-specific checks (e.g. length-bounds). */
  contentType: string;
  /**
   * Min/max woordaantal uit deliverable-types.ts. Null = geen bound.
   */
  wordBounds: { min: number | null; max: number | null };
  /**
   * Group-type voor schema-valid + markdown-leakage check.
   * E.g. 'metadata' (plain key:value), 'body' (markdown), 'headline' (plain text).
   */
  groupType: string;
  /**
   * Of dit type een CTA vereist (uit deliverable-types.ts requiresCTA flag).
   */
  requiresCTA: boolean;
  /**
   * Bekende brand-entities (producten, personas, etc.) voor hallucination-flag.
   * Names alleen — als content naam X noemt en X niet in deze list staat,
   * potentially hallucinated.
   */
  knownEntities: string[];
  /**
   * Voor duplicate-content check: andere varianten in dezelfde generation-batch.
   * Lege array bij eerste variant.
   */
  siblingVariants: string[];
}

/**
 * Aggregated result voor alle 15 checks op één variant.
 * Returned door runAllPropertyEvals(variant, context).
 */
export interface PropertyEvalRunResult {
  /** True als geen block-severity violations. False bij ≥ 1 block. */
  passed: boolean;
  /** Alle 15 check-results. */
  results: PropertyEvalResult[];
  /** Subset: alleen block-severity violations. */
  blockViolations: PropertyEvalResult[];
  /** Subset: alleen warn-severity violations. */
  warnings: PropertyEvalResult[];
  /** Cumulative runtime in ms voor telemetry. */
  runtimeMs: number;
}
