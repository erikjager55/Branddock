/**
 * Design-system primitives per LayoutStyle (Pad C Sub-Sprint A).
 *
 * Maps Prisma LayoutStyle enum naar concrete design-system regels die
 * Puck-component renderers consumeren in Sub-Sprint B. Pure constants —
 * geen DB, geen side-effects, fully testable.
 *
 * Zie docs/specs/brand-design-system.md voor de complete spec.
 */

// ─── LayoutStyle enum (mirror van Prisma) ─────────────────

export type LayoutStyle =
  | 'MINIMAL'
  | 'EDITORIAL'
  | 'COMMERCIAL'
  | 'EXPERIENTIAL'
  | 'PLAYFUL';

export const DEFAULT_LAYOUT_STYLE: LayoutStyle = 'COMMERCIAL';

// ─── Spacing scale ─────────────────────────────────────────

export type SpacingScale = readonly number[];

const SPACING_PRESETS: Record<LayoutStyle, SpacingScale> = {
  MINIMAL: [4, 8, 16, 24, 48, 64, 96, 128, 160] as const,
  EDITORIAL: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const,
  COMMERCIAL: [4, 8, 12, 16, 20, 24, 32, 48, 64] as const,
  EXPERIENTIAL: [8, 16, 24, 32, 48, 64, 96, 128, 192] as const,
  PLAYFUL: [4, 8, 12, 16, 24, 32, 48, 64, 96] as const,
};

/**
 * Pak waarde dichtst bij target uit de scale. Gebruik in component-renderers:
 *   spacing(designSystem, 96) → returns 96 (MINIMAL), 64 (COMMERCIAL)
 */
export function nearestSpacing(scale: SpacingScale, target: number): number {
  if (scale.length === 0) return target;
  return scale.reduce((closest, current) =>
    Math.abs(current - target) < Math.abs(closest - target) ? current : closest,
  );
}

// ─── Typography scale ──────────────────────────────────────

export interface TypographyClass {
  fontFamily: string;
  weights: readonly number[];
  sizes: readonly number[];
  lineHeight: number;
  letterSpacing: string;
  textTransform?: 'uppercase' | 'none';
}

export interface TypographyScale {
  display: TypographyClass;
  heading: TypographyClass;
  body: TypographyClass;
  label: TypographyClass;
}

const TYPOGRAPHY_PRESETS: Record<LayoutStyle, TypographyScale> = {
  MINIMAL: {
    display: {
      fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
      weights: [300, 400],
      sizes: [48, 64, 72, 96],
      lineHeight: 1.05,
      letterSpacing: '-0.01em',
    },
    heading: {
      fontFamily: '"Cormorant Garamond", "Times New Roman", serif',
      weights: [300, 400],
      sizes: [24, 32, 48],
      lineHeight: 1.15,
      letterSpacing: 'normal',
    },
    body: {
      fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
      weights: [300, 400],
      sizes: [13, 14, 16],
      lineHeight: 1.8,
      letterSpacing: 'normal',
    },
    label: {
      fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
      weights: [400, 500],
      sizes: [11, 12],
      lineHeight: 1.2,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
  },
  EDITORIAL: {
    display: {
      fontFamily: '"Playfair Display", Georgia, serif',
      weights: [400, 500, 700],
      sizes: [40, 56, 72, 96],
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
    },
    heading: {
      fontFamily: '"Playfair Display", Georgia, serif',
      weights: [500, 700],
      sizes: [24, 32, 40],
      lineHeight: 1.2,
      letterSpacing: 'normal',
    },
    body: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      weights: [400, 500],
      sizes: [14, 16, 18],
      lineHeight: 1.7,
      letterSpacing: 'normal',
    },
    label: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      weights: [500, 600],
      sizes: [11, 12],
      lineHeight: 1.2,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  COMMERCIAL: {
    display: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      weights: [600, 700],
      sizes: [32, 42, 52],
      lineHeight: 1.1,
      letterSpacing: 'normal',
    },
    heading: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      weights: [600, 700],
      sizes: [20, 24, 28],
      lineHeight: 1.2,
      letterSpacing: 'normal',
    },
    body: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      weights: [400, 500],
      sizes: [14, 15, 16],
      lineHeight: 1.5,
      letterSpacing: 'normal',
    },
    label: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      weights: [500, 600],
      sizes: [11, 12],
      lineHeight: 1.2,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
  },
  EXPERIENTIAL: {
    display: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      weights: [700, 800, 900],
      sizes: [56, 80, 112, 144],
      lineHeight: 0.95,
      letterSpacing: '-0.03em',
    },
    heading: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      weights: [600, 700],
      sizes: [28, 36, 48],
      lineHeight: 1.1,
      letterSpacing: '-0.01em',
    },
    body: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      weights: [400, 500],
      sizes: [16, 18, 20],
      lineHeight: 1.6,
      letterSpacing: 'normal',
    },
    label: {
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      weights: [600, 700],
      sizes: [12, 14],
      lineHeight: 1.2,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    },
  },
  PLAYFUL: {
    display: {
      fontFamily: '"Nunito", "Helvetica Neue", sans-serif',
      weights: [700, 800],
      sizes: [36, 48, 64],
      lineHeight: 1.15,
      letterSpacing: 'normal',
    },
    heading: {
      fontFamily: '"Nunito", "Helvetica Neue", sans-serif',
      weights: [700],
      sizes: [22, 28, 36],
      lineHeight: 1.25,
      letterSpacing: 'normal',
    },
    body: {
      fontFamily: '"Nunito", "Helvetica Neue", sans-serif',
      weights: [400, 500, 600],
      sizes: [14, 16, 18],
      lineHeight: 1.65,
      letterSpacing: 'normal',
    },
    label: {
      fontFamily: '"Nunito", "Helvetica Neue", sans-serif',
      weights: [600, 700],
      sizes: [12, 13],
      lineHeight: 1.2,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
  },
};

// ─── Radius rule ───────────────────────────────────────────

export interface RadiusRule {
  default: number;
  button: number;
  card: number;
  pill: number;
  input: number;
}

const RADIUS_PRESETS: Record<LayoutStyle, RadiusRule> = {
  MINIMAL: { default: 0, button: 0, card: 0, pill: 0, input: 0 },
  EDITORIAL: { default: 0, button: 0, card: 0, pill: 999, input: 0 },
  COMMERCIAL: { default: 8, button: 8, card: 12, pill: 999, input: 8 },
  EXPERIENTIAL: { default: 4, button: 4, card: 4, pill: 999, input: 4 },
  PLAYFUL: { default: 12, button: 999, card: 16, pill: 999, input: 12 },
};

// ─── Section alternation ───────────────────────────────────

export type SectionBackground =
  | 'surface'
  | 'surfaceMuted'
  | 'surfaceInverted'
  | 'brand'
  | 'brandSubtle';

export interface SectionAlternation {
  pattern: readonly SectionBackground[];
}

const ALTERNATION_PRESETS: Record<LayoutStyle, SectionAlternation> = {
  MINIMAL: {
    pattern: [
      'surfaceInverted',
      'surfaceMuted',
      'surface',
      'surfaceInverted',
      'surface',
      'surfaceMuted',
      'surface',
      'surfaceInverted',
    ] as const,
  },
  EDITORIAL: {
    pattern: ['surface', 'surface', 'surfaceMuted', 'surface', 'surface', 'surfaceMuted'] as const,
  },
  COMMERCIAL: {
    pattern: ['brand', 'surface', 'surface', 'surface', 'surface', 'surface', 'surface', 'surface'] as const,
  },
  EXPERIENTIAL: {
    pattern: ['surfaceInverted', 'surface', 'surfaceInverted', 'surface', 'surfaceInverted', 'surface'] as const,
  },
  PLAYFUL: {
    pattern: ['brand', 'surface', 'brandSubtle', 'surface', 'surfaceMuted', 'surface'] as const,
  },
};

/**
 * Voor sectie op index i — geeft de target-background-rol terug.
 * Wraps wanneer index > pattern-length.
 */
export function backgroundForSectionIndex(
  alternation: SectionAlternation,
  index: number,
): SectionBackground {
  if (alternation.pattern.length === 0) return 'surface';
  return alternation.pattern[index % alternation.pattern.length];
}

// ─── Image strategy ────────────────────────────────────────

export interface ImageStrategy {
  placeholderStyle: 'dark-framed' | 'subtle-gray' | 'illustration' | 'gradient';
  placeholderLabel: string;
  heroPhotographyStyle: string;
  testimonialPhotoStyle: 'circle' | 'square' | 'rounded-square' | 'none';
  usePersonaPhotos: boolean;
}

const IMAGE_STRATEGY_PRESETS: Record<LayoutStyle, ImageStrategy> = {
  MINIMAL: {
    placeholderStyle: 'dark-framed',
    placeholderLabel: '[Architectuurfoto]',
    heroPhotographyStyle:
      'dramatic, architectural, dark, editorial photography with strong shadows and depth',
    testimonialPhotoStyle: 'none',
    usePersonaPhotos: false,
  },
  EDITORIAL: {
    placeholderStyle: 'subtle-gray',
    placeholderLabel: '[Editorial photo]',
    heroPhotographyStyle:
      'magazine-style editorial photography, soft natural lighting, sophisticated composition',
    testimonialPhotoStyle: 'square',
    usePersonaPhotos: true,
  },
  COMMERCIAL: {
    placeholderStyle: 'subtle-gray',
    placeholderLabel: '[Product image]',
    heroPhotographyStyle:
      'bright, clean product photography on white background, professional commercial style',
    testimonialPhotoStyle: 'circle',
    usePersonaPhotos: true,
  },
  EXPERIENTIAL: {
    placeholderStyle: 'gradient',
    placeholderLabel: '[Hero image]',
    heroPhotographyStyle:
      'cinematic, immersive scene with depth, story-driven photography evoking emotion',
    testimonialPhotoStyle: 'rounded-square',
    usePersonaPhotos: true,
  },
  PLAYFUL: {
    placeholderStyle: 'illustration',
    placeholderLabel: '[Illustration]',
    heroPhotographyStyle:
      'colorful illustration or playful product shot, friendly approachable tone, warm palette',
    testimonialPhotoStyle: 'circle',
    usePersonaPhotos: true,
  },
};

// ─── DesignSystem bundle ───────────────────────────────────

export interface DesignSystem {
  layoutStyle: LayoutStyle;
  spacing: SpacingScale;
  typography: TypographyScale;
  radius: RadiusRule;
  imageStrategy: ImageStrategy;
  sectionAlternation: SectionAlternation;
}

/**
 * Resolve volledig design-system voor een layoutStyle.
 * Pure functie — geeft altijd consistente preset terug.
 */
export function getDesignSystemForLayoutStyle(layoutStyle: LayoutStyle): DesignSystem {
  return {
    layoutStyle,
    spacing: SPACING_PRESETS[layoutStyle],
    typography: TYPOGRAPHY_PRESETS[layoutStyle],
    radius: RADIUS_PRESETS[layoutStyle],
    imageStrategy: IMAGE_STRATEGY_PRESETS[layoutStyle],
    sectionAlternation: ALTERNATION_PRESETS[layoutStyle],
  };
}

/**
 * Resolve design-system met optionele per-workspace overrides.
 * Overrides komen uit BrandStyleguide.{spacingScaleOverride,...} JSON-velden.
 */
export function resolveDesignSystem(
  layoutStyle: LayoutStyle,
  overrides?: {
    spacingScale?: SpacingScale;
    typographyScale?: TypographyScale;
    radiusRule?: RadiusRule;
    imageStrategy?: ImageStrategy;
    sectionAlternation?: SectionAlternation;
  },
): DesignSystem {
  const base = getDesignSystemForLayoutStyle(layoutStyle);
  return {
    layoutStyle,
    spacing: overrides?.spacingScale ?? base.spacing,
    typography: overrides?.typographyScale ?? base.typography,
    radius: overrides?.radiusRule ?? base.radius,
    imageStrategy: overrides?.imageStrategy ?? base.imageStrategy,
    sectionAlternation: overrides?.sectionAlternation ?? base.sectionAlternation,
  };
}
