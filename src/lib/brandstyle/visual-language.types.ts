// =============================================================
// Visual Language (Vormentaal) Types
//
// Structured profile of a brand's visual design DNA:
// corners, shadows, spacing, depth, shape language, etc.
// Detected from website CSS + AI analysis during Brandstyle analysis.
// Stored as JSON on BrandStyleguide, consumed via brand context in generation.
// =============================================================

/** Corner and edge treatment */
export interface VLCornerRadius {
  dominant: "sharp" | "slightly-rounded" | "rounded" | "pill";
  radiusPx: number;
  consistency: "uniform" | "mixed";
}

/** Shadow and elevation style */
export interface VLShadow {
  style: "none" | "subtle" | "medium" | "bold" | "colored";
  elevation: "flat" | "low" | "medium" | "high";
  color: string | null;
}

/** Line and border usage */
export interface VLLine {
  borders: "none" | "thin" | "medium" | "thick";
  dividers: "none" | "thin" | "thick" | "decorative";
  decorativeLines: boolean;
}

/** Shape language */
export interface VLShape {
  primary: "geometric" | "organic" | "mixed";
  angularity: number; // 1-10, 1=very round/organic, 10=very angular
  symmetry: "strict" | "approximate" | "asymmetric";
}

/** Spatial feel */
export interface VLSpace {
  density: "compact" | "balanced" | "spacious";
  whitespaceRatio: number; // 0-1
  sectionSpacing: "tight" | "normal" | "generous";
}

/** Depth and dimensionality */
export interface VLDepth {
  dimensionality: "flat-2d" | "subtle-layers" | "layered" | "deep-3d";
  overlapping: boolean;
  glassmorphism: boolean;
}

/** Visual weight */
export interface VLWeight {
  overall: "light" | "balanced" | "heavy";
  textDensity: "minimal" | "moderate" | "dense";
  ornamentLevel: "none" | "subtle" | "moderate" | "rich";
}

/** How colors are applied */
export interface VLColorApplication {
  buttonStyle: string;
  backgroundApproach: string;
  accentUsage: string;
  gradientPresence: "none" | "subtle" | "prominent";
}

/** Component design patterns */
export interface VLComponents {
  cardStyle: string;
  buttonShape: string;
  inputStyle: string;
  spacingSystem: string;
}

/** Complete visual language profile — stored as JSON on BrandStyleguide */
export interface VisualLanguageProfile {
  version: number;
  analyzedAt: string;
  sourceUrl: string;

  cornerRadius: VLCornerRadius;
  shadow: VLShadow;
  line: VLLine;
  shape: VLShape;
  space: VLSpace;
  depth: VLDepth;
  weight: VLWeight;
  colorApplication: VLColorApplication;
  components: VLComponents;

  /** Human-readable 2-3 sentence summary */
  summary: string;
  /** Ready-to-inject prompt text for AI generation — the practical output */
  promptFragment: string;
}

// ─── CSS Heuristics (programmatic extraction) ──────────────

/** Raw CSS heuristic data extracted before AI analysis */
export interface CssVisualHeuristics {
  borderRadius: {
    values: number[];
    median: number;
    mostCommon: number;
    hasVariation: boolean;
  };
  boxShadow: {
    count: number;
    hasSubtle: boolean;
    hasBold: boolean;
    hasColored: boolean;
    samples: string[];
  };
  borders: {
    count: number;
    widths: number[];
    medianWidth: number;
    colors: string[];
  };
  spacing: {
    values: number[];
    median: number;
    gridBase: number | null; // 4, 8, or null if inconsistent
  };
  gradients: {
    count: number;
    samples: string[];
  };
  glassmorphism: {
    detected: boolean;
    backdropFilter: boolean;
    semiTransparentBg: boolean;
  };
}
