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
  | 'design-language';

export interface CalibrationAsk {
  /** Stable key for dedup/telemetry, e.g. 'logo-primary-missing'. */
  id: string;
  severity: CalibrationSeverity;
  section: CalibrationSection;
  /** Short user-facing title. */
  title: string;
  /** What we need and why it matters. */
  detail: string;
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
