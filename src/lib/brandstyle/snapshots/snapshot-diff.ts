// =============================================================
// Snapshot Diff Engine
//
// Berekent een gestructureerd verschil tussen twee BrandstyleSnapshot
// rijen — niet text-diff op HTML, maar token-niveau changes op de
// canonical DesignSystemModel.
//
// Twee uitgangen:
//   - computeSnapshotDiff(prev, next) → SnapshotDiff (structureel)
//   - summarizeDiff(diff) → string[] met human-readable bullets
//
// Cosmetic-vs-significant: kleur-changes met RGB Euclidean distance
// < 3 worden gemarkeerd als cosmetic en standaard verborgen in
// summarize. Voorkomt dat anti-aliasing / JPEG-noise als rebrand
// wordt gepresenteerd.
//
// Inspiratie: hyperbrowserai/competitor-tracker `summarize.ts` —
// regex-first noise filter VOOR een eventuele LLM-call.
// =============================================================

import type {
  DesignSystemModel,
  ColorToken,
  TypographyToken,
  DimensionToken,
  ElevationToken,
  ComponentToken,
  SemanticColorRole,
  TypeRole,
  RoundedScale,
  SpacingScale,
  ElevationLevel,
} from '@/lib/export/design-system/canonical';

// ─── Diff types ───────────────────────────────────────

export interface ColorChange {
  role: SemanticColorRole;
  from: string | null;
  to: string | null;
  /** True als de wijziging onder de RGB-tolerance valt — anti-aliasing
   *  noise. Default verborgen in user-facing summary. */
  cosmetic?: boolean;
}

export interface TypographyChange {
  role: TypeRole;
  from: TypographyToken | null;
  to: TypographyToken | null;
  fields: Array<keyof TypographyToken>;
}

export interface DimensionChange<K extends string> {
  key: K;
  from: number | null;
  to: number | null;
}

export interface ElevationChange {
  level: ElevationLevel;
  from: string | null;
  to: string | null;
}

export interface ComponentChange {
  variant: string;
  from: ComponentToken | null;
  to: ComponentToken | null;
}

export interface BrandFoundationChange {
  assetsAdded: string[];
  assetsRemoved: string[];
  assetsChanged: string[];
  personasAdded: string[];
  personasRemoved: string[];
  competitorsAdded: string[];
  competitorsRemoved: string[];
}

export interface SnapshotDiff {
  fromCapturedAt: string;
  toCapturedAt: string;
  colors: ColorChange[];
  typography: TypographyChange[];
  rounded: DimensionChange<RoundedScale>[];
  spacing: DimensionChange<SpacingScale>[];
  elevation: ElevationChange[];
  components: ComponentChange[];
  brandFoundation: BrandFoundationChange;
  /** True als de hele diff cosmetic of leeg is — UI verbergt dan timeline-summary. */
  isTrivial: boolean;
}

// ─── Public entry ─────────────────────────────────────

export function computeSnapshotDiff(
  prev: { capturedAt: string; tokensJson: unknown },
  next: { capturedAt: string; tokensJson: unknown },
): SnapshotDiff {
  const prevModel = prev.tokensJson as DesignSystemModel;
  const nextModel = next.tokensJson as DesignSystemModel;

  const diff: SnapshotDiff = {
    fromCapturedAt: prev.capturedAt,
    toCapturedAt: next.capturedAt,
    colors: diffColors(prevModel, nextModel),
    typography: diffTypography(prevModel, nextModel),
    rounded: diffDimensions<RoundedScale>(
      prevModel.rounded ?? {},
      nextModel.rounded ?? {},
    ),
    spacing: diffDimensions<SpacingScale>(
      prevModel.spacing ?? {},
      nextModel.spacing ?? {},
    ),
    elevation: diffElevation(prevModel, nextModel),
    components: diffComponents(prevModel, nextModel),
    brandFoundation: diffBrandFoundation(prevModel, nextModel),
    isTrivial: false,
  };
  diff.isTrivial = isTrivialDiff(diff);
  return diff;
}

/**
 * Pre-filter regex-first / structural noise filter — geen LLM.
 * Output: bullets per categorie. Cosmetic kleur-changes default uit.
 */
export function summarizeDiff(
  diff: SnapshotDiff,
  options: { includeCosmetic?: boolean } = {},
): string[] {
  const out: string[] = [];

  for (const c of diff.colors) {
    if (!options.includeCosmetic && c.cosmetic) continue;
    if (c.from === null) {
      out.push(`Color role added: ${c.role} = ${c.to}`);
    } else if (c.to === null) {
      out.push(`Color role removed: ${c.role} (was ${c.from})`);
    } else {
      out.push(`${c.role}: ${c.from} → ${c.to}`);
    }
  }

  for (const t of diff.typography) {
    if (t.from === null && t.to !== null) {
      out.push(`Typography role added: ${t.role} (${t.to.fontFamily} ${t.to.fontSize})`);
    } else if (t.to === null && t.from !== null) {
      out.push(`Typography role removed: ${t.role}`);
    } else if (t.from && t.to) {
      out.push(`Typography ${t.role}: ${formatTypoChange(t)}`);
    }
  }

  for (const r of diff.rounded) {
    if (r.from === null) out.push(`Rounded scale.${r.key} added: ${r.to}px`);
    else if (r.to === null) out.push(`Rounded scale.${r.key} removed (was ${r.from}px)`);
    else out.push(`Rounded scale.${r.key}: ${r.from}px → ${r.to}px`);
  }

  for (const s of diff.spacing) {
    if (s.from === null) out.push(`Spacing scale.${s.key} added: ${s.to}px`);
    else if (s.to === null) out.push(`Spacing scale.${s.key} removed (was ${s.from}px)`);
    else out.push(`Spacing scale.${s.key}: ${s.from}px → ${s.to}px`);
  }

  if (diff.elevation.length > 0) {
    out.push(`Elevation system: ${diff.elevation.length} level(s) changed`);
  }

  if (diff.components.length > 0) {
    const added = diff.components.filter((c) => c.from === null).length;
    const removed = diff.components.filter((c) => c.to === null).length;
    const changed = diff.components.filter((c) => c.from !== null && c.to !== null).length;
    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (removed > 0) parts.push(`${removed} removed`);
    if (changed > 0) parts.push(`${changed} changed`);
    out.push(`Components: ${parts.join(', ')}`);
  }

  const bf = diff.brandFoundation;
  if (bf.assetsChanged.length > 0) {
    out.push(`Brand assets updated: ${bf.assetsChanged.slice(0, 3).join(', ')}${bf.assetsChanged.length > 3 ? ` (+${bf.assetsChanged.length - 3} more)` : ''}`);
  }
  if (bf.personasAdded.length > 0 || bf.personasRemoved.length > 0) {
    const parts: string[] = [];
    if (bf.personasAdded.length > 0) parts.push(`${bf.personasAdded.length} added`);
    if (bf.personasRemoved.length > 0) parts.push(`${bf.personasRemoved.length} removed`);
    out.push(`Personas: ${parts.join(', ')}`);
  }
  if (bf.competitorsAdded.length > 0 || bf.competitorsRemoved.length > 0) {
    const parts: string[] = [];
    if (bf.competitorsAdded.length > 0) parts.push(`${bf.competitorsAdded.length} added`);
    if (bf.competitorsRemoved.length > 0) parts.push(`${bf.competitorsRemoved.length} removed`);
    out.push(`Competitors: ${parts.join(', ')}`);
  }

  return out;
}

/**
 * Korte 1-zin samenvatting voor de timeline-rij. Pikt het meest
 * impactful change-type en formatteert dat compact.
 */
export function shortSummary(diff: SnapshotDiff): string {
  if (diff.isTrivial) return 'No significant changes';

  const colorChanges = diff.colors.filter((c) => !c.cosmetic).length;
  const typoChanges = diff.typography.length;
  const tokenChanges = diff.rounded.length + diff.spacing.length + diff.elevation.length;
  const componentChanges = diff.components.length;

  const parts: string[] = [];
  if (colorChanges > 0) parts.push(`${colorChanges} color${colorChanges === 1 ? '' : 's'}`);
  if (typoChanges > 0) parts.push(`${typoChanges} typography`);
  if (tokenChanges > 0) parts.push(`${tokenChanges} token${tokenChanges === 1 ? '' : 's'}`);
  if (componentChanges > 0) parts.push(`${componentChanges} component${componentChanges === 1 ? '' : 's'}`);

  if (parts.length === 0) return 'Brand foundation updated';
  return parts.slice(0, 3).join(', ') + (parts.length > 3 ? ', …' : '');
}

// ─── Diff helpers per category ────────────────────────

function diffColors(prev: DesignSystemModel, next: DesignSystemModel): ColorChange[] {
  const allRoles = new Set<SemanticColorRole>([
    ...(Object.keys(prev.colors ?? {}) as SemanticColorRole[]),
    ...(Object.keys(next.colors ?? {}) as SemanticColorRole[]),
  ]);
  const out: ColorChange[] = [];
  for (const role of allRoles) {
    const a = (prev.colors ?? {})[role];
    const b = (next.colors ?? {})[role];
    const from = a?.value ?? null;
    const to = b?.value ?? null;
    if (from === to) continue;
    const cosmetic = from && to ? rgbDistance(from, to) < 3 : false;
    out.push({ role, from, to, cosmetic });
  }
  return out;
}

function diffTypography(prev: DesignSystemModel, next: DesignSystemModel): TypographyChange[] {
  const allRoles = new Set<TypeRole>([
    ...(Object.keys(prev.typography ?? {}) as TypeRole[]),
    ...(Object.keys(next.typography ?? {}) as TypeRole[]),
  ]);
  const out: TypographyChange[] = [];
  for (const role of allRoles) {
    const a = (prev.typography ?? {})[role] ?? null;
    const b = (next.typography ?? {})[role] ?? null;
    if (!a && !b) continue;
    if (!a || !b) {
      out.push({ role, from: a, to: b, fields: [] });
      continue;
    }
    const fields: Array<keyof TypographyToken> = [];
    for (const f of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const) {
      if (a[f] !== b[f]) fields.push(f);
    }
    if (fields.length > 0) out.push({ role, from: a, to: b, fields });
  }
  return out;
}

function diffDimensions<K extends string>(
  prevMap: Partial<Record<K, DimensionToken>>,
  nextMap: Partial<Record<K, DimensionToken>>,
): DimensionChange<K>[] {
  const allKeys = new Set<K>([
    ...(Object.keys(prevMap) as K[]),
    ...(Object.keys(nextMap) as K[]),
  ]);
  const out: DimensionChange<K>[] = [];
  for (const key of allKeys) {
    const a = prevMap[key]?.value ?? null;
    const b = nextMap[key]?.value ?? null;
    if (a === b) continue;
    out.push({ key, from: a, to: b });
  }
  return out;
}

function diffElevation(prev: DesignSystemModel, next: DesignSystemModel): ElevationChange[] {
  const prevMap = (prev.elevation ?? {}) as Partial<Record<ElevationLevel, ElevationToken>>;
  const nextMap = (next.elevation ?? {}) as Partial<Record<ElevationLevel, ElevationToken>>;
  const allLevels = new Set<ElevationLevel>([
    ...(Object.keys(prevMap) as ElevationLevel[]),
    ...(Object.keys(nextMap) as ElevationLevel[]),
  ]);
  const out: ElevationChange[] = [];
  for (const level of allLevels) {
    const a = prevMap[level]?.value ?? null;
    const b = nextMap[level]?.value ?? null;
    if (a === b) continue;
    out.push({ level, from: a, to: b });
  }
  return out;
}

function diffComponents(prev: DesignSystemModel, next: DesignSystemModel): ComponentChange[] {
  const prevMap = prev.components ?? {};
  const nextMap = next.components ?? {};
  const allVariants = new Set<string>([...Object.keys(prevMap), ...Object.keys(nextMap)]);
  const out: ComponentChange[] = [];
  for (const variant of allVariants) {
    const a = prevMap[variant] ?? null;
    const b = nextMap[variant] ?? null;
    if (!a && !b) continue;
    if (!a || !b) {
      out.push({ variant, from: a, to: b });
      continue;
    }
    if (!shallowEqualProps(a.props, b.props)) {
      out.push({ variant, from: a, to: b });
    }
  }
  return out;
}

function diffBrandFoundation(
  prev: DesignSystemModel,
  next: DesignSystemModel,
): BrandFoundationChange {
  const pa = (prev.extensions?.brandFoundation?.assets ?? []).map((a) => a.slug);
  const na = (next.extensions?.brandFoundation?.assets ?? []).map((a) => a.slug);
  const pp = (prev.extensions?.brandFoundation?.personas ?? []).map((p) => p.name);
  const np = (next.extensions?.brandFoundation?.personas ?? []).map((p) => p.name);
  const pc = (prev.extensions?.brandFoundation?.competitors ?? []).map((c) => c.name);
  const nc = (next.extensions?.brandFoundation?.competitors ?? []).map((c) => c.name);

  const prevAssetMap = new Map(
    (prev.extensions?.brandFoundation?.assets ?? []).map((a) => [a.slug, a.summary]),
  );
  const nextAssetMap = new Map(
    (next.extensions?.brandFoundation?.assets ?? []).map((a) => [a.slug, a.summary]),
  );
  const assetsChanged: string[] = [];
  for (const [slug, prevSummary] of prevAssetMap) {
    const nextSummary = nextAssetMap.get(slug);
    if (nextSummary !== undefined && nextSummary !== prevSummary) {
      assetsChanged.push(slug);
    }
  }

  return {
    assetsAdded: na.filter((s) => !pa.includes(s)),
    assetsRemoved: pa.filter((s) => !na.includes(s)),
    assetsChanged,
    personasAdded: np.filter((n) => !pp.includes(n)),
    personasRemoved: pp.filter((n) => !np.includes(n)),
    competitorsAdded: nc.filter((n) => !pc.includes(n)),
    competitorsRemoved: pc.filter((n) => !nc.includes(n)),
  };
}

// ─── Helpers ──────────────────────────────────────────

function rgbDistance(hexA: string, hexB: string): number {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return Infinity;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function shallowEqualProps(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function formatTypoChange(t: TypographyChange): string {
  if (!t.from || !t.to) return '';
  const parts: string[] = [];
  if (t.fields.includes('fontFamily')) {
    parts.push(`${t.from.fontFamily} → ${t.to.fontFamily}`);
  }
  if (t.fields.includes('fontSize')) {
    parts.push(`size ${t.from.fontSize} → ${t.to.fontSize}`);
  }
  if (t.fields.includes('fontWeight')) {
    parts.push(`weight ${t.from.fontWeight} → ${t.to.fontWeight}`);
  }
  if (t.fields.includes('lineHeight')) {
    parts.push(`line-height ${t.from.lineHeight} → ${t.to.lineHeight}`);
  }
  return parts.join(', ');
}

function isTrivialDiff(diff: SnapshotDiff): boolean {
  const significantColors = diff.colors.filter((c) => !c.cosmetic).length;
  const bf = diff.brandFoundation;
  const bfChanges =
    bf.assetsAdded.length +
    bf.assetsRemoved.length +
    bf.assetsChanged.length +
    bf.personasAdded.length +
    bf.personasRemoved.length +
    bf.competitorsAdded.length +
    bf.competitorsRemoved.length;
  return (
    significantColors === 0 &&
    diff.typography.length === 0 &&
    diff.rounded.length === 0 &&
    diff.spacing.length === 0 &&
    diff.elevation.length === 0 &&
    diff.components.length === 0 &&
    bfChanges === 0
  );
}

// Type re-exports voor consumers
export type { ColorToken };
