// =============================================================
// Client-side helpers voor het semanticTokens JSON-blob dat op
// BrandStyleguide.semanticTokens leeft. Omdat de DB-shape volledig
// wordt beheerd door de server-side resolver (zie
// src/lib/brandstyle/semantic-role-resolver.ts) houden we hier
// alleen type-guards + lichte selectors — geen business logic.
// =============================================================

import type {
  SemanticTokens,
  SemanticTokensResolved,
  SemanticColorRole,
} from '@/lib/brandstyle/semantic-role-resolver';

export type {
  SemanticTokens,
  SemanticTokensResolved,
  SemanticColorRole,
};

/** Veilig een unknown blob parsen als SemanticTokens. Retourneert null
 *  voor oudere styleguides die nog niet door de resolver zijn gegaan. */
export function parseSemanticTokens(raw: unknown): SemanticTokens | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SemanticTokens>;
  if (!r.resolved || typeof r.resolved !== 'object') return null;
  return raw as SemanticTokens;
}

/** Merge overrides in resolved zodat UI één flat view heeft. Muteert niet. */
export function effectiveColors(
  tokens: SemanticTokens,
): Partial<Record<SemanticColorRole, string>> {
  return {
    ...tokens.resolved.colors,
    ...(tokens.overrides?.colors ?? {}),
  };
}

/** Volgorde waarin kleuren gerendered moeten worden in de UI. Dezelfde
 *  als de DESIGN.md emitter output. */
export const COLOR_ROLE_ORDER: SemanticColorRole[] = [
  'primary',
  'on-primary',
  'primary-container',
  'secondary',
  'on-secondary',
  'tertiary',
  'on-tertiary',
  'surface',
  'on-surface',
  'surface-variant',
  'outline',
  'error',
  'on-error',
  'success',
  'warning',
  'info',
];

/**
 * Bouwt een Map<typescaleLevel, designMdRole> uit bestaande semanticTokens +
 * typeScale. Matches op fontSize (tolerantie 0.5px) + fontWeight. Fallback:
 * als semanticTokens ontbreekt, gebruik index-gebaseerde deterministische
 * mapping (grootste = headline-display, etc.) — consistent met de resolver.
 */
export function buildTypeRoleMap(
  typeScale: Array<{ level: string; size: string; weight: string }> | null | undefined,
  tokens: SemanticTokens | null,
): Map<string, string> {
  const out = new Map<string, string>();
  if (!typeScale || typeScale.length === 0) return out;
  if (tokens) {
    for (const row of typeScale) {
      const px = parseCssSize(row.size);
      const weight = Number(row.weight) || 400;
      const matched = findTypographyRoleMatch(tokens.resolved.typography, px, weight);
      if (matched) out.set(row.level, matched);
    }
    if (out.size > 0) return out;
  }
  // Fallback: sort by size desc + map in order
  const sorted = [...typeScale]
    .map((row, idx) => ({ row, idx, px: parseCssSize(row.size) }))
    .sort((a, b) => b.px - a.px);
  const headlines = ['headline-display', 'headline-lg', 'headline-md', 'headline-sm'];
  const bodies = ['body-lg', 'body-md', 'body-sm'];
  const labels = ['label-lg', 'label-md', 'label-sm'];
  let hi = 0, bi = 0, li = 0;
  for (const { row, px } of sorted) {
    let role: string | undefined;
    if (px >= 24 && hi < headlines.length) role = headlines[hi++];
    else if (px <= 13 && li < labels.length) role = labels[li++];
    else if (bi < bodies.length) role = bodies[bi++];
    else if (li < labels.length) role = labels[li++];
    if (role) out.set(row.level, role);
  }
  return out;
}

function parseCssSize(raw: string): number {
  if (!raw) return 0;
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em)?$/);
  if (!m) return Number(raw) || 0;
  const val = Number(m[1]);
  const unit = m[2];
  if (unit === 'rem' || unit === 'em') return val * 16;
  return val;
}

function findTypographyRoleMatch(
  typography: Partial<Record<string, { fontSize: string; fontWeight: number }>>,
  targetPx: number,
  targetWeight: number,
): string | undefined {
  let bestRole: string | undefined;
  let bestDelta = Infinity;
  for (const [role, tok] of Object.entries(typography)) {
    if (!tok) continue;
    const tokPx = parseCssSize(tok.fontSize);
    const pxDelta = Math.abs(tokPx - targetPx);
    if (pxDelta > 1) continue;
    const weightDelta = Math.abs(tok.fontWeight - targetWeight);
    const total = pxDelta + weightDelta / 100;
    if (total < bestDelta) {
      bestDelta = total;
      bestRole = role;
    }
  }
  return bestRole;
}

/** Mensvriendelijke beschrijving per rol — hergebruikt in UI tooltips en
 *  override-modal helper-text. */
export const COLOR_ROLE_DESCRIPTIONS: Record<SemanticColorRole, string> = {
  primary: 'Dominant brand color — single most important CTA per screen',
  'on-primary': 'Text/icon color on primary surfaces (auto: WCAG-safe)',
  'primary-container': 'Muted variant of primary for hover/support surfaces',
  secondary: 'Supporting brand color for secondary actions',
  'on-secondary': 'Text/icon color on secondary surfaces',
  tertiary: 'Tertiary accent for variety and decorative moments',
  'on-tertiary': 'Text/icon color on tertiary surfaces',
  surface: 'Default page/card background',
  'on-surface': 'Primary body text color on default surfaces',
  'surface-variant': 'Alternative panel/section background',
  outline: 'Border color for dividers and low-emphasis elements',
  error: 'Errors, destructive actions, critical warnings',
  'on-error': 'Text/icon color on error surfaces',
  success: 'Success feedback and positive states',
  warning: 'Caution and non-critical issues',
  info: 'Informational messages',
};
