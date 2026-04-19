// =============================================================
// Framework Token Detectors — Multi-stack brand-color extraction
//
// Each detector recognises one CSS-framework or design-system fingerprint
// and extracts canonical brand tokens with **high confidence**. The result
// outranks generic CSS-variable scanning and frequency analysis when
// building the authoritative palette.
//
// Why this exists:
//   The generic scraper picks up any color-related CSS variable, but many
//   sites ship framework defaults (Bricks Builder palette, Bootstrap utility
//   colors, shadcn placeholder values) alongside the actual brand tokens.
//   Without framework awareness, the defaults outnumber and outrank the
//   real brand colors.
//
// How to add a new framework:
//   1. Define a `FrameworkDetector` entry in FRAMEWORK_DETECTORS below.
//   2. `detect()` should be a fast, cheap fingerprint check on raw CSS/HTML.
//   3. `extractTokens()` should pull the framework's canonical brand tokens
//      and map each to a BrandRole.
// =============================================================

/** Semantic role of a detected brand token. */
export type BrandRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'semantic'
  | 'unknown';

/** A brand color token recognised by a framework detector. */
export interface DetectedToken {
  /** Normalised hex (uppercase, 6 digits, with leading #). */
  hex: string;
  /** Semantic role this token plays in the framework's design system. */
  role: BrandRole;
  /** Framework-specific source label, e.g. `'acss:--primary-hex'`. */
  source: string;
  /** Always 'high' for detector-extracted tokens. */
  confidence: 'high';
}

/** A framework recogniser plug-in. */
export interface FrameworkDetector {
  /** Stable identifier shown in logs and stored on AuthoritativeColor. */
  name: string;
  /** Cheap fingerprint check — true if this framework appears to be in use. */
  detect: (css: string, html: string) => boolean;
  /** Extract canonical brand tokens. Called only when `detect()` returned true. */
  extractTokens: (css: string) => DetectedToken[];
}

// ─── Helpers ──────────────────────────────────────────

/** Normalise a hex string to `#RRGGBB` uppercase, or null if invalid. */
function normHex(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^#/, '');
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toUpperCase();
  }
  if (clean.length === 6) return `#${clean}`.toUpperCase();
  if (clean.length === 8) return `#${clean.slice(0, 6)}`.toUpperCase();
  return null;
}

/** Convert HSL components to hex. */
function hslToHex(h: number, s: number, l: number): string | null {
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number): string =>
    Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Extract a hex value from a CSS color expression (hex, rgb(), hsl()). */
function extractHexFromExpr(expr: string): string | null {
  const trimmed = expr.trim();
  // Hex (#RGB / #RRGGBB / #RRGGBBAA)
  const hexMatch = trimmed.match(/#[0-9A-Fa-f]{3,8}\b/);
  if (hexMatch) return normHex(hexMatch[0]);
  // rgb() / rgba()
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
  if (rgbMatch) {
    const [r, g, b] = [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map(Number);
    if (r <= 255 && g <= 255 && b <= 255) {
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    }
  }
  // hsl() / hsla() — both legacy and modern syntax
  const hslMatch = trimmed.match(/hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/);
  if (hslMatch) {
    return hslToHex(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]));
  }
  return null;
}

// ─── Framework Detectors ──────────────────────────────

const ACSS_DETECTOR: FrameworkDetector = {
  name: 'acss',
  detect: (css) => /--primary-hex\s*:\s*#/.test(css) || /--secondary-hex\s*:\s*#/.test(css),
  extractTokens: (css) => {
    // ACSS canonical tokens: --primary-hex, --secondary-hex, --base-hex, --neutral-hex, --accent-hex
    const ROLE_MAP: Record<string, BrandRole> = {
      primary: 'primary',
      secondary: 'secondary',
      accent: 'accent',
      base: 'neutral',
      neutral: 'neutral',
    };
    const tokens: DetectedToken[] = [];
    const pattern = /--(primary|secondary|accent|base|neutral)-hex\s*:\s*(#[0-9A-Fa-f]{3,8})/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
      const hex = normHex(match[2]);
      if (!hex) continue;
      tokens.push({
        hex,
        role: ROLE_MAP[match[1].toLowerCase()] ?? 'unknown',
        source: `acss:--${match[1].toLowerCase()}-hex`,
        confidence: 'high',
      });
    }
    return tokens;
  },
};

const ELEMENTOR_DETECTOR: FrameworkDetector = {
  name: 'elementor',
  detect: (css) => /--e-global-color-/.test(css),
  extractTokens: (css) => {
    // Elementor exposes its color palette as --e-global-color-{slug}.
    // The 4 canonical slots are primary/secondary/text/accent (rest are
    // user-defined globals, which we treat as 'unknown' role).
    const ROLE_MAP: Record<string, BrandRole> = {
      primary: 'primary',
      secondary: 'secondary',
      text: 'neutral',
      accent: 'accent',
    };
    const tokens: DetectedToken[] = [];
    const pattern = /--e-global-color-([\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
      const hex = extractHexFromExpr(match[2]);
      if (!hex) continue;
      const slug = match[1].toLowerCase();
      tokens.push({
        hex,
        role: ROLE_MAP[slug] ?? 'unknown',
        source: `elementor:--e-global-color-${slug}`,
        confidence: 'high',
      });
    }
    return tokens;
  },
};

const TAILWIND_V4_DETECTOR: FrameworkDetector = {
  name: 'tailwind-v4',
  detect: (css) => /@theme\s*[\w-]*\s*\{/.test(css),
  extractTokens: (css) => {
    // Tailwind v4 declares brand colors inside `@theme { --color-* }` blocks.
    // We extract every `--color-{name}: <value>` and infer role from name.
    const tokens: DetectedToken[] = [];
    const themeBlockPattern = /@theme[\s\w-]*\{([^}]+)\}/g;
    let block: RegExpExecArray | null;
    while ((block = themeBlockPattern.exec(css)) !== null) {
      const inner = block[1];
      const colorPattern = /--color-([\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|oklch\([^)]+\))/gi;
      let varMatch: RegExpExecArray | null;
      while ((varMatch = colorPattern.exec(inner)) !== null) {
        const hex = extractHexFromExpr(varMatch[2]);
        if (!hex) continue;
        const slug = varMatch[1].toLowerCase();
        tokens.push({
          hex,
          role: inferRoleFromName(slug),
          source: `tailwind-v4:--color-${slug}`,
          confidence: 'high',
        });
      }
    }
    return tokens;
  },
};

const SHADCN_DETECTOR: FrameworkDetector = {
  name: 'shadcn',
  detect: (css) => {
    // shadcn/ui uses HSL components without the `hsl()` function wrapper:
    //   --primary: 240 5% 64%;
    // Detect this fingerprint specifically (rules out shadcn-style tokens
    // that some other libraries also use with literal hex).
    return /--primary\s*:\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%/.test(css);
  },
  extractTokens: (css) => {
    const ROLE_MAP: Record<string, BrandRole> = {
      primary: 'primary',
      secondary: 'secondary',
      accent: 'accent',
      destructive: 'semantic',
      background: 'neutral',
      foreground: 'neutral',
      muted: 'neutral',
      card: 'neutral',
    };
    const tokens: DetectedToken[] = [];
    // Match shadcn-style HSL components: `--primary: 240 5% 64%;`
    const pattern = /--(primary|secondary|accent|destructive|background|foreground|muted|card)\s*:\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
      const hex = hslToHex(parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4]));
      if (!hex) continue;
      const slug = match[1].toLowerCase();
      tokens.push({
        hex,
        role: ROLE_MAP[slug] ?? 'unknown',
        source: `shadcn:--${slug}`,
        confidence: 'high',
      });
    }
    return tokens;
  },
};

const MATERIAL_DETECTOR: FrameworkDetector = {
  name: 'material',
  detect: (css) => /--md-sys-color-/.test(css),
  extractTokens: (css) => {
    // Material Design 3 system tokens.
    const ROLE_MAP: Record<string, BrandRole> = {
      primary: 'primary',
      secondary: 'secondary',
      tertiary: 'accent',
      surface: 'neutral',
      background: 'neutral',
      error: 'semantic',
    };
    const tokens: DetectedToken[] = [];
    const pattern = /--md-sys-color-([\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
      const hex = extractHexFromExpr(match[2]);
      if (!hex) continue;
      const slug = match[1].toLowerCase();
      const role = Object.entries(ROLE_MAP).find(([k]) => slug.startsWith(k))?.[1] ?? 'unknown';
      tokens.push({
        hex,
        role,
        source: `material:--md-sys-color-${slug}`,
        confidence: 'high',
      });
    }
    return tokens;
  },
};

const BOOTSTRAP_DETECTOR: FrameworkDetector = {
  name: 'bootstrap',
  detect: (css) => /--bs-primary\s*:/.test(css),
  extractTokens: (css) => {
    // Bootstrap 5+ exposes `--bs-{role}` for theme colors. Note: many sites
    // ship Bootstrap defaults unmodified — we still extract them but they'll
    // share the palette with stronger signals.
    const ROLE_MAP: Record<string, BrandRole> = {
      primary: 'primary',
      secondary: 'secondary',
      success: 'semantic',
      danger: 'semantic',
      warning: 'semantic',
      info: 'semantic',
      light: 'neutral',
      dark: 'neutral',
    };
    const tokens: DetectedToken[] = [];
    const pattern = /--bs-(primary|secondary|success|danger|warning|info|light|dark)\s*:\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
      const hex = extractHexFromExpr(match[2]);
      if (!hex) continue;
      const slug = match[1].toLowerCase();
      tokens.push({
        hex,
        role: ROLE_MAP[slug] ?? 'unknown',
        source: `bootstrap:--bs-${slug}`,
        confidence: 'high',
      });
    }
    return tokens;
  },
};

const WEBFLOW_DETECTOR: FrameworkDetector = {
  name: 'webflow',
  // CSS-only fingerprint: Webflow ships utility classes prefixed with `.w-`
  // (.w-layout-, .w-nav, .w-button, .w-form) and namespaced data attrs.
  detect: (css, html) =>
    /\.w-(?:layout|nav|button|form|container|row|col|tab|dropdown|slider)-?/.test(css) ||
    /webflow\.com\/api/.test(html) ||
    /<html[^>]+data-wf-(?:page|site)/.test(html),
  extractTokens: (css) => {
    // Webflow doesn't publish a strict token-naming convention, but most
    // Webflow sites declare `--brand-*` or `--color-*` swatch variables in
    // the global stylesheet. We extract anything that names a role explicitly.
    const tokens: DetectedToken[] = [];
    const pattern = /--(?:brand-|color-)([\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
      const hex = extractHexFromExpr(match[2]);
      if (!hex) continue;
      const slug = match[1].toLowerCase();
      tokens.push({
        hex,
        role: inferRoleFromName(slug),
        source: `webflow:--${slug}`,
        confidence: 'high',
      });
    }
    return tokens;
  },
};

// ─── Registry ─────────────────────────────────────────

/** Ordered list of detectors. Earlier entries take priority when the same
 *  hex is recognised by multiple frameworks (rare). */
export const FRAMEWORK_DETECTORS: FrameworkDetector[] = [
  ACSS_DETECTOR,
  TAILWIND_V4_DETECTOR,
  SHADCN_DETECTOR,
  ELEMENTOR_DETECTOR,
  MATERIAL_DETECTOR,
  BOOTSTRAP_DETECTOR,
  WEBFLOW_DETECTOR,
];

/**
 * Run all framework detectors against the scraped CSS / HTML.
 * Returns the list of frameworks that fingerprinted positive plus the
 * combined deduplicated detector tokens (first-source-wins on hex collision).
 */
export function runFrameworkDetectors(css: string, html: string): {
  frameworks: string[];
  tokens: DetectedToken[];
} {
  const frameworks: string[] = [];
  const tokens: DetectedToken[] = [];
  const seenHex = new Set<string>();

  for (const detector of FRAMEWORK_DETECTORS) {
    if (!detector.detect(css, html)) continue;
    frameworks.push(detector.name);
    for (const token of detector.extractTokens(css)) {
      if (seenHex.has(token.hex)) continue;
      seenHex.add(token.hex);
      tokens.push(token);
    }
  }

  return { frameworks, tokens };
}

// ─── Role-inference for unknown name slugs ────────────

/** Infer a BrandRole from a token's name slug for frameworks without a
 *  fixed role taxonomy (Tailwind, Webflow). Falls back to 'unknown'. */
function inferRoleFromName(slug: string): BrandRole {
  const lower = slug.toLowerCase();
  if (/^(brand|primary)/.test(lower)) return 'primary';
  if (/^secondary/.test(lower)) return 'secondary';
  if (/^(accent|cta|highlight)/.test(lower)) return 'accent';
  if (/(success|warning|danger|error|info)/.test(lower)) return 'semantic';
  if (/(neutral|gray|grey|surface|background|muted|text)/.test(lower)) return 'neutral';
  return 'unknown';
}
