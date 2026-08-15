// =============================================================
// Brandstyle Calibration Report
//
// Consolidates extraction-quality signals that today live scattered
// across the styleguide tabs (per-color confidence, OBSERVED/RECOMMENDED
// guideline prefixes, missing logo variants, detected-but-unfiled fonts)
// into a single list of actionable "asks". Pure function, no IO — the
// caller passes already-fetched styleguide parts so this stays trivially
// testable and reusable from any route/UI.
//
// Mirrors the "honest calibration / explicit asks" move from external
// design-system builders (brandstyle comparison 2026-06-24, lesson L6).
// =============================================================

/** How urgent an ask is. `critical` blocks trustworthy output, `review` is a confirm. */
export type CalibrationSeverity = 'critical' | 'suggestion' | 'review';

/** Which styleguide section an ask concerns — drives the UI deep-link. */
export type CalibrationSection =
  | 'logo'
  | 'colors'
  | 'typography'
  | 'imagery'
  | 'design-language'
  /** Merkregels — deep-linkt naar de Manifest-tab, waar de regels staan. */
  | 'rules';

/**
 * Een uitvoerbare correctie bij een ask. Het rapport blijft puur: het
 * *beschrijft* de actie, de UI voert 'm uit. Zonder dit veld zou een suggestie
 * als "deze regel botst structureel" nergens heen leiden — precies de
 * vlag-zonder-schrijver-val uit W5.
 */
export interface CalibrationAskAction {
  /**
   * Welke laag de correctie raakt. Een uit de voiceguide gesyncte regel is
   * niet direct bewerkbaar (`/api/brand-rules/[id]` weigert `auto:*`); daar is
   * het bronveld het curatiepunt en verdwijnt de regel via de re-sync.
   */
  kind:
    | 'remove-voiceguide-term'
    | 'weaken-brand-rule'
    | 'delete-brand-rule'
    | 'weaken-styleguide-rule'
    | 'delete-styleguide-rule';
  /** Knoplabel. */
  label: string;
  /** Doel-id: de regel, of (bij een voiceguide-term) de regel die verdwijnt. */
  ruleId: string;
  /**
   * De term zoals hij in de voiceguide staat — níet het regel-pattern. De sync
   * expandeert stem-varianten ("exclusief" → "exclusieve"), dus filteren op het
   * pattern vindt niets en zou de knop gegarandeerd laten falen.
   */
  term?: string;
  /**
   * Álle voiceguide-velden waar de term in staat. Dezelfde term kan uit
   * `wordsWeAvoid` én `vocabularyDont` gesynct zijn; één veld opschonen laat
   * de regel dan gewoon bestaan.
   */
  sourceFields?: Array<'wordsWeAvoid' | 'vocabularyDont' | 'antiPatterns'>;
}

export interface CalibrationAsk {
  /** Stable key for dedup/telemetry, e.g. 'logo-primary-missing'. */
  id: string;
  severity: CalibrationSeverity;
  section: CalibrationSection;
  /** Short user-facing title. */
  title: string;
  /** What we need and why it matters. */
  detail: string;
  /** Inline correcties; leeg/afwezig betekent "alleen deep-link". */
  actions?: CalibrationAskAction[];
  /**
   * Onderdruk de deep-link-knop. Nodig wanneer geen enkele styleguide-tab het
   * item toont: het Manifest rendert alleen StyleguideRules, dus voor een ask
   * over een BrandRule zou "Manifest →" naar een scherm leiden waar de regel
   * niet staat.
   */
  hideJump?: boolean;
}

export interface BrandstyleCalibrationReport {
  asks: CalibrationAsk[];
  counts: { critical: number; suggestion: number; review: number };
  /** True when there is nothing to ask — extraction looks clean/complete. */
  clean: boolean;
}

/** Minimal structural input — kept decoupled from the Prisma row for testability. */
export interface CalibrationInput {
  colors: { confidence: string | null; category: string }[];
  fonts: { source: string; availability: string; fileUrl: string | null }[];
  logos: { variant: string }[];
  /** Raw guideline strings that may carry an `OBSERVED:`/`RECOMMENDED:` prefix. */
  guidelines?: string[];
  /** Number of derived type-scale levels (h1..body). */
  typeScaleCount?: number;
  /**
   * Secties waarvan de goedkeuring verviel doordat een re-analyse de data
   * veranderde (W5-driftreset). De caller levert de review-rijen met een
   * `staleAt`-stempel aan; hier worden ze actionable asks.
   */
  staleReviews?: StaleReviewInput[];
  /**
   * Regels die structureel botsen met wat we genereren (R4-feedback-loop). De
   * caller levert de al-geaggregeerde signalen aan; de drempel en de
   * levende-regel-filter zitten in `rule-violation-stats.ts`.
   */
  ruleViolations?: RuleViolationInput[];
  /**
   * Hoeveel van de geëxtraheerde data de gebruiker handmatig corrigeerde
   * (R4, tweede poot). Veel correcties op één sectie zeggen iets over de
   * extractie, niet over de gebruiker.
   */
  overrideSignals?: OverrideSignalInput[];
  /**
   * Secties die de gebruiker op "needs work" zette mét een toelichting
   * (R4, derde poot). Die tekst is het scherpste extractie-signaal dat er is —
   * iemand heeft letterlijk opgeschreven wat er mis is — en stroomde nergens
   * terug.
   */
  reviewFeedback?: ReviewFeedbackInput[];
}

/** Eén sectie waarvan de gebruiker een groot deel handmatig corrigeerde. */
export interface OverrideSignalInput {
  /** Kalibratie-sectie (deep-link-doel). */
  section: CalibrationSection;
  /** Wat er gecorrigeerd is, voor de titel: 'colors', 'components'. */
  label: string;
  /** Aantal handmatig gecorrigeerde items. */
  overridden: number;
  /** Totaal aantal items in die sectie. */
  total: number;
}

/** Eén review-sectie met een toelichting van de gebruiker. */
export interface ReviewFeedbackInput {
  section: CalibrationSection;
  /** Label van de review-sectie. */
  label: string;
  /** De letterlijke tekst die de gebruiker schreef. */
  feedback: string;
  /** Stabiele sleutel voor dedup/telemetrie. */
  key: string;
}

/** Eén regel die vaak genoeg wordt overtreden om te bevragen. */
export interface RuleViolationInput {
  /** Stabiele sleutel (`<ruleType>::<pattern>`), voor dedup/telemetrie. */
  key: string;
  /** Leesbare regel — het verboden woord of de constraint-omschrijving. */
  label: string;
  /** Aantal generaties waarin de regel werd overtreden. */
  generationsHit: number;
  /** Totaal aantal generaties in het venster. */
  generationsTotal: number;
  /** Afgerond percentage, voor de tekst. */
  ratePercent: number;
  /** Uitvoerbare correcties. */
  actions: CalibrationAskAction[];
  /**
   * Of het Manifest deze regel daadwerkelijk toont. Alleen StyleguideRules
   * staan daar; voor een BrandRule is de deep-link een doodlopend spoor.
   */
  visibleInManifest: boolean;
}

/** Eén sectie waarvan de goedkeuring is ingetrokken door drift. */
export interface StaleReviewInput {
  /** Kalibratie-sectie waaronder de ask valt (deep-link-doel). */
  section: CalibrationSection;
  /** Label van de review-sectie, voor de titel. */
  label: string;
  /** Waarom de goedkeuring verviel. */
  reason: string;
  /** Stabiele sleutel voor dedup/telemetrie. */
  key: string;
}

/** Kort een citaat af op woordgrens, zodat een lange toelichting de titel niet opblaast. */
function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Count guidelines whose only provenance is `RECOMMENDED:` (inferred, not observed). */
function countRecommendedOnly(guidelines: string[]): number {
  return guidelines.filter((g) => /^\s*recommended:/i.test(g)).length;
}

/**
 * Uncertain only when the scraper *explicitly* flagged the color low. A `null`
 * confidence means "manually added or unscored" (e.g. colors added via the
 * colors API carry no confidence) — flagging those would be a false positive.
 */
function isLowConfidence(confidence: string | null): boolean {
  return confidence?.toLowerCase() === 'low';
}

/**
 * Build the consolidated calibration report for one styleguide.
 *
 * Returns every actionable gap as a typed {@link CalibrationAsk}, grouped so the
 * UI can render "critical first" without per-item noise. Pure — no DB, no fetch.
 */
export function buildBrandstyleCalibrationReport(
  input: CalibrationInput,
): BrandstyleCalibrationReport {
  const asks: CalibrationAsk[] = [];

  // ── Verlopen goedkeuringen ──────────────────────────────
  // Eerst: dit is het enige type ask dat over een *besluit* van de gebruiker
  // gaat dat niet meer klopt, in plaats van over ontbrekende extractie.
  for (const stale of input.staleReviews ?? []) {
    asks.push({
      id: `review-stale-${stale.key}`,
      severity: 'review',
      section: stale.section,
      title: `${stale.label} needs re-approval`,
      detail: `${stale.reason}. Your earlier approval covered the previous version, so this section is back to pending.`,
    });
  }

  // ── Wat de gebruiker zelf al corrigeerde ────────────────
  // Als iemand de helft van een sectie handmatig overschrijft, is dat geen
  // gebruikersfout maar een extractie-oordeel. Eerst, want het is het meest
  // directe signaal dat we hebben.
  for (const o of input.overrideSignals ?? []) {
    const pct = Math.round((o.overridden / o.total) * 100);
    asks.push({
      id: `override-${o.section}`,
      severity: 'suggestion',
      section: o.section,
      title: `You corrected ${o.overridden} of ${o.total} ${o.label} by hand`,
      detail:
        `That is ${pct}% — enough that the extraction itself is probably off, not just ` +
        `individual items. Worth a re-analysis or a look at the source. Your corrections ` +
        `are safe either way: they survive a refresh.`,
    });
  }

  // ── Wat de gebruiker over de extractie schreef ──────────
  // Zelfde rem als op de regel-suggesties: zonder cap duwen 16 secties met
  // feedback de rest uit beeld.
  for (const r of (input.reviewFeedback ?? []).slice(0, 3)) {
    asks.push({
      id: `review-feedback-${r.key}`,
      severity: 'review',
      section: r.section,
      title: `You flagged ${r.label}: "${truncate(r.feedback, 90)}"`,
      detail:
        `You marked this section as needing work and wrote that down. Nothing acted on it ` +
        `yet — re-extract the section, or fix it by hand and approve.`,
    });
  }

  // ── Regels die structureel botsen ───────────────────────
  // De bibliotheek leert van haar eigen gebruik (R4). Een regel die telkens
  // sneuvelt is óf te streng geformuleerd óf verkeerd geëxtraheerd — beide
  // zijn curatie-signalen, en de ask stelt precies die vraag.
  for (const v of input.ruleViolations ?? []) {
    asks.push({
      id: `rule-violated-${v.key}`,
      severity: 'suggestion',
      section: 'rules',
      title: `"${v.label}" clashes with what you generate`,
      detail:
        `Violated in ${v.ratePercent}% of recent generations ` +
        `(${v.generationsHit} of ${v.generationsTotal}). Either the rule is stricter than you ` +
        `meant, or it was extracted wrong — both are worth a look. The count covers only the ` +
        `generations this rule could apply to.`,
      actions: v.actions,
      hideJump: !v.visibleInManifest,
    });
  }
  // ── Logo ────────────────────────────────────────────────
  const hasPrimaryLogo = input.logos.some((l) => l.variant === 'PRIMARY');
  if (!hasPrimaryLogo) {
    asks.push({
      id: 'logo-primary-missing',
      severity: 'critical',
      section: 'logo',
      title: 'No primary logo captured',
      detail:
        "The analysis couldn't find a clear brand logo. Upload the official logo (preferably SVG) so exports and previews are correct.",
    });
  } else {
    const hasDark = input.logos.some((l) => l.variant === 'DARK');
    const hasLight = input.logos.some((l) => l.variant === 'LIGHT');
    if (!hasDark && !hasLight) {
      asks.push({
        id: 'logo-contrast-variant-missing',
        severity: 'suggestion',
        section: 'logo',
        title: 'No dark/light logo variant',
        detail:
          'Only the primary logo is captured. Add a variant for dark backgrounds so the logo stays legible on any surface.',
      });
    }
  }

  // ── Colors ──────────────────────────────────────────────
  if (input.colors.length === 0) {
    asks.push({
      id: 'colors-missing',
      severity: 'critical',
      section: 'colors',
      title: 'No brand colors extracted',
      detail: 'Add the color palette manually, or analyze a source with clear brand colors.',
    });
  } else {
    const lowCount = input.colors.filter((c) => isLowConfidence(c.confidence)).length;
    if (lowCount > 0) {
      asks.push({
        id: 'colors-low-confidence',
        severity: 'review',
        section: 'colors',
        title: `${lowCount} low-confidence color${lowCount > 1 ? 's' : ''}`,
        detail:
          'Check whether these are real brand colors or incidental values from the source, then confirm or remove them.',
      });
    }
  }

  // ── Fonts ───────────────────────────────────────────────
  const fontsNeedingFile = input.fonts.filter(
    (f) =>
      f.source === 'DETECTED' &&
      !f.fileUrl &&
      (f.availability === 'COMMERCIAL' || f.availability === 'UNKNOWN'),
  ).length;
  if (fontsNeedingFile > 0) {
    asks.push({
      id: 'fonts-file-missing',
      severity: 'suggestion',
      section: 'typography',
      title: `${fontsNeedingFile} font${fontsNeedingFile > 1 ? 's' : ''} without a file`,
      detail:
        'These fonts were detected but cannot be loaded (no Google/Adobe source). Upload the font file for correct previews and exports.',
    });
  }

  // ── Typography ──────────────────────────────────────────
  if ((input.typeScaleCount ?? 0) === 0) {
    asks.push({
      id: 'type-scale-missing',
      severity: 'review',
      section: 'typography',
      title: 'No type scale extracted',
      detail: 'No per-level font sizes were found. Set the type scale manually if desired.',
    });
  }

  // ── Inferred (RECOMMENDED-only) guidelines ──────────────
  const recommendedOnly = countRecommendedOnly(input.guidelines ?? []);
  if (recommendedOnly > 0) {
    asks.push({
      id: 'guidelines-recommended-only',
      severity: 'review',
      section: 'imagery',
      title: `${recommendedOnly} recommended guideline${recommendedOnly > 1 ? 's' : ''}`,
      detail:
        'These guidelines were suggested by AI, not observed in the source. Confirm or remove them before they feed content generation.',
    });
  }

  const counts = {
    critical: asks.filter((a) => a.severity === 'critical').length,
    suggestion: asks.filter((a) => a.severity === 'suggestion').length,
    review: asks.filter((a) => a.severity === 'review').length,
  };

  return { asks, counts, clean: asks.length === 0 };
}
