// =============================================================
// Design System Resolver
//
// Bouwt DesignSystemModel op uit de database. Leest:
// - BrandStyleguide.semanticTokens (Fase 0 resolver output)
// - BrandStyleguide prose-velden (guidelines, don'ts, voice, imagery)
// - BrandAsset[] voor Brand Foundation extension (maximum scope)
// - Persona[] + Competitor[] voor Brand Foundation extension
//
// Lazy fallback: als semanticTokens == null, roept semantic-role-resolver
// aan en persist het resultaat (idempotent). Dit dekt oudere styleguides.
// =============================================================

import { prisma } from '@/lib/prisma';
import {
  resolveSemanticTokens,
  type SemanticTokens,
  type SemanticTokensResolved,
  type SemanticColorRole,
  type RoundedScale,
  type SpacingScale,
  type ElevationLevel,
} from '@/lib/brandstyle/semantic-role-resolver';
import type {
  DesignSystemModel,
  ColorToken,
  DimensionToken,
  ElevationToken,
  ComponentToken,
  ProseBlocks,
  Extensions,
  VoiceExtension,
  ImageryExtension,
  IconographyExtension,
  BrandFoundationExtension,
  BrandFoundationAssetSummary,
  PersonaSummary,
  CompetitorSummary,
} from './canonical';

// ─── Public entry ─────────────────────────────────────

export async function buildDesignSystemModel(
  workspaceId: string,
): Promise<DesignSystemModel> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspaceId },
  });

  const tokens = await ensureSemanticTokens(styleguide);

  const [brandAssets, personas, competitors] = await Promise.all([
    fetchBrandAssetSummaries(workspaceId),
    fetchPersonaSummaries(workspaceId),
    fetchCompetitorSummaries(workspaceId),
  ]);

  return {
    meta: {
      name: workspace.name,
      description: undefined,
      workspaceId: workspace.id,
      workspaceSlug: workspace.slug,
      generatedAt: new Date().toISOString(),
      resolvedAt: tokens?.resolvedAt,
      resolverVersion: tokens?.resolverVersion,
    },
    colors: buildColorTokens(tokens),
    typography: tokens?.resolved.typography ?? {},
    rounded: buildDimensionMap<RoundedScale>(tokens?.resolved.rounded),
    spacing: buildDimensionMap<SpacingScale>(tokens?.resolved.spacing),
    elevation: buildElevationMap(tokens?.resolved.elevation),
    components: buildComponentTokens(tokens),
    prose: buildProse(styleguide),
    extensions: buildExtensions(styleguide, brandAssets, personas, competitors),
  };
}

// ─── Semantic tokens ensure ───────────────────────────

async function ensureSemanticTokens(
  styleguide: { id: string; semanticTokens: unknown } | null,
): Promise<SemanticTokens | null> {
  if (!styleguide) return null;
  const existing = parseSemanticTokens(styleguide.semanticTokens);
  if (existing) return mergeOverrides(existing);

  try {
    const fresh = await resolveSemanticTokens(styleguide.id);
    await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: { semanticTokens: JSON.parse(JSON.stringify(fresh)) },
    });
    return mergeOverrides(fresh);
  } catch (err) {
    console.warn(
      `[design-system/resolver] Lazy semantic-tokens resolve failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function parseSemanticTokens(raw: unknown): SemanticTokens | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SemanticTokens>;
  if (!r.resolved || typeof r.resolved !== 'object') return null;
  return raw as SemanticTokens;
}

function mergeOverrides(tokens: SemanticTokens): SemanticTokens {
  if (!tokens.overrides) return tokens;
  const merged: SemanticTokensResolved = {
    colors: { ...tokens.resolved.colors, ...tokens.overrides.colors },
    typography: { ...tokens.resolved.typography, ...tokens.overrides.typography },
    rounded: { ...tokens.resolved.rounded, ...tokens.overrides.rounded },
    spacing: { ...tokens.resolved.spacing, ...tokens.overrides.spacing },
    elevation: { ...tokens.resolved.elevation, ...tokens.overrides.elevation },
    componentVariants: {
      ...tokens.resolved.componentVariants,
      ...tokens.overrides.componentVariants,
    },
  };
  return { ...tokens, resolved: merged };
}

// ─── Builders ─────────────────────────────────────────

function buildColorTokens(
  tokens: SemanticTokens | null,
): Partial<Record<SemanticColorRole, ColorToken>> {
  if (!tokens) return {};
  const result: Partial<Record<SemanticColorRole, ColorToken>> = {};
  for (const [roleKey, hex] of Object.entries(tokens.resolved.colors)) {
    if (!hex) continue;
    const role = roleKey as SemanticColorRole;
    result[role] = {
      value: hex,
      role,
      source: tokens.diagnostics.source[role],
    };
  }
  return result;
}

function buildDimensionMap<K extends string>(
  scale: Partial<Record<K, number>> | undefined,
): Partial<Record<K, DimensionToken>> {
  if (!scale) return {};
  const out: Partial<Record<K, DimensionToken>> = {};
  for (const [key, px] of Object.entries(scale)) {
    if (typeof px !== 'number') continue;
    out[key as K] = { value: px };
  }
  return out;
}

function buildElevationMap(
  elevation: Partial<Record<ElevationLevel, string>> | undefined,
): Partial<Record<ElevationLevel, ElevationToken>> {
  if (!elevation) return {};
  const out: Partial<Record<ElevationLevel, ElevationToken>> = {};
  for (const [level, shadow] of Object.entries(elevation)) {
    if (typeof shadow !== 'string') continue;
    out[level as ElevationLevel] = { value: shadow };
  }
  return out;
}

function buildComponentTokens(
  tokens: SemanticTokens | null,
): Record<string, ComponentToken> {
  if (!tokens) return {};
  // Groepeer componenten per variant-label en kies de eerste als representative.
  // TODO Sprint 2.3: rijkere component-props uit StyleguideComponent.extractedStyles
  //      (padding, rounded, fontSize) mappen op token-refs {spacing.md}, {rounded.md}.
  const variantsByLabel: Record<string, string[]> = {};
  for (const [componentId, variant] of Object.entries(tokens.resolved.componentVariants)) {
    (variantsByLabel[variant] ??= []).push(componentId);
  }
  const out: Record<string, ComponentToken> = {};
  for (const [variant, ids] of Object.entries(variantsByLabel)) {
    const primaryColor = tokens.resolved.colors.primary;
    const secondaryColor = tokens.resolved.colors.secondary;
    const props: Record<string, string> = {};
    if (variant === 'button-primary') {
      props.backgroundColor = '{colors.primary}';
      props.textColor = '{colors.on-primary}';
    } else if (variant === 'button-secondary') {
      props.backgroundColor = '{colors.secondary}';
      props.textColor = '{colors.on-secondary}';
    } else if (variant === 'button-tertiary') {
      props.backgroundColor = '{colors.tertiary}';
      props.textColor = '{colors.on-tertiary}';
    } else if (variant === 'button-ghost') {
      props.backgroundColor = 'transparent';
      props.textColor = '{colors.primary}';
    }
    if (Object.keys(props).length > 0) {
      out[variant] = { props };
    }
    void ids;
    void primaryColor;
    void secondaryColor;
  }
  return out;
}

// ─── Prose + Extensions ──────────────────────────────

function buildProse(styleguide: unknown): ProseBlocks {
  if (!styleguide || typeof styleguide !== 'object') return {};
  const sg = styleguide as Record<string, unknown>;
  const dos = collectStringArrays(sg, ['logoGuidelines', 'photographyGuidelines', 'illustrationGuidelines']);
  const donts = collectStringArrays(sg, ['logoDonts', 'colorDonts', 'imageryDonts', 'graphicElementsDonts', 'iconographyDonts']);

  return {
    overview: undefined,
    colors: formatProseList(sg.colorDonts, 'color'),
    typography: undefined,
    layout: prosifyLayoutPrinciples(sg.layoutPrinciples),
    elevation: undefined,
    shapes: prosifyGraphicElements(sg.graphicElements),
    components: undefined,
    dosDonts: [...dos.map((d) => `Do: ${d}`), ...donts.map((d) => `Don't: ${d}`)],
  };
}

function buildExtensions(
  styleguide: unknown,
  brandAssets: BrandFoundationAssetSummary[],
  personas: PersonaSummary[],
  competitors: CompetitorSummary[],
): Extensions {
  const sg = (styleguide ?? {}) as Record<string, unknown>;
  const voice = buildVoiceExtension(sg);
  const imagery = buildImageryExtension(sg);
  const iconography = buildIconographyExtension(sg.iconographyStyle);

  const brandFoundation: BrandFoundationExtension | undefined =
    brandAssets.length || personas.length || competitors.length
      ? { assets: brandAssets, personas, competitors }
      : undefined;

  const ext: Extensions = {};
  if (voice) ext.voice = voice;
  if (imagery) ext.imagery = imagery;
  if (iconography) ext.iconography = iconography;
  if (brandFoundation) ext.brandFoundation = brandFoundation;
  return ext;
}

function buildVoiceExtension(sg: Record<string, unknown>): VoiceExtension | undefined {
  const principles = asStringArray(sg.contentGuidelines);
  const writing = asStringArray(sg.writingGuidelines);
  const phrases = sg.examplePhrases;
  const doSay: string[] = [];
  const dontSay: string[] = [];
  if (phrases && typeof phrases === 'object') {
    const p = phrases as Record<string, unknown>;
    for (const s of asStringArray(p.doSay)) doSay.push(s);
    for (const s of asStringArray(p.dontSay)) dontSay.push(s);
  }
  if (!principles.length && !writing.length && !doSay.length && !dontSay.length) return undefined;
  return {
    principles,
    writingGuidelines: writing,
    doSayPhrases: doSay,
    dontSayPhrases: dontSay,
  };
}

function buildImageryExtension(sg: Record<string, unknown>): ImageryExtension | undefined {
  const photo = sg.photographyStyle;
  const photographyStyle =
    photo && typeof photo === 'object' && 'mood' in photo
      ? String((photo as Record<string, unknown>).mood ?? '') || undefined
      : undefined;
  const guidelines = asStringArray(sg.photographyGuidelines);
  const illustration = asStringArray(sg.illustrationGuidelines);
  const donts = asStringArray(sg.imageryDonts);
  if (!photographyStyle && !guidelines.length && !illustration.length && !donts.length) return undefined;
  return {
    photographyStyle,
    photographyGuidelines: guidelines,
    illustrationGuidelines: illustration,
    donts,
  };
}

function buildIconographyExtension(raw: unknown): IconographyExtension | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const ext: IconographyExtension = {
    style: asStringOrUndefined(obj.style),
    strokeWeight: asStringOrUndefined(obj.strokeWeight),
    cornerRadius: asStringOrUndefined(obj.cornerRadius),
    sizing: asStringOrUndefined(obj.sizing),
    colorUsage: asStringOrUndefined(obj.colorUsage),
  };
  return Object.values(ext).some((v) => v) ? ext : undefined;
}

// ─── DB fetchers voor Brand Foundation ────────────────

async function fetchBrandAssetSummaries(
  workspaceId: string,
): Promise<BrandFoundationAssetSummary[]> {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId },
    select: {
      name: true,
      slug: true,
      category: true,
      description: true,
      content: true,
      frameworkType: true,
      frameworkData: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return assets.map((a) => ({
    name: a.name,
    slug: a.slug,
    category: String(a.category),
    frameworkType: a.frameworkType,
    summary: summarizeBrandAsset(a.description, a.content, a.frameworkData),
  }));
}

function summarizeBrandAsset(
  description: unknown,
  content: unknown,
  frameworkData: unknown,
): string {
  // Kies eerste beschikbare narrative veld, truncate tot 280 chars.
  // content + frameworkData zijn Json? — kunnen strings, objects, of null zijn.
  const contentStr = extractNarrativeString(content);
  if (contentStr) return truncate(contentStr, 280);
  if (typeof description === 'string' && description.trim().length > 0) {
    return truncate(description.trim(), 280);
  }
  if (frameworkData && typeof frameworkData === 'object') {
    const fd = frameworkData as Record<string, unknown>;
    for (const key of ['statement', 'promiseStatement', 'coreMessage', 'essence', 'why']) {
      const val = fd[key];
      if (typeof val === 'string' && val.trim().length > 0) return truncate(val.trim(), 280);
    }
  }
  return '';
}

function extractNarrativeString(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['statement', 'text', 'value', 'content']) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    }
  }
  return null;
}

async function fetchPersonaSummaries(workspaceId: string): Promise<PersonaSummary[]> {
  const personas = await prisma.persona.findMany({
    where: { workspaceId },
    select: {
      name: true,
      tagline: true,
      coreValues: true,
      goals: true,
      interests: true,
      quote: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return personas.map((p) => ({
    name: p.name,
    tagline: p.tagline,
    keyTraits: [...(p.coreValues ?? []), ...(p.interests ?? [])].slice(0, 5),
    primaryGoal: (p.goals ?? [])[0],
    quote: p.quote,
  }));
}

async function fetchCompetitorSummaries(workspaceId: string): Promise<CompetitorSummary[]> {
  const competitors = await prisma.competitor.findMany({
    where: { workspaceId, status: 'ANALYZED' },
    select: {
      name: true,
      tier: true,
      valueProposition: true,
      differentiators: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return competitors.map((c) => ({
    name: c.name,
    tier: String(c.tier),
    positioning: c.valueProposition ?? undefined,
    differentiators: c.differentiators ?? [],
  }));
}

// ─── Helpers ──────────────────────────────────────────

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function asStringOrUndefined(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
}

function collectStringArrays(obj: Record<string, unknown>, keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) out.push(...asStringArray(obj[key]));
  return out;
}

function formatProseList(raw: unknown, label: string): string | undefined {
  const list = asStringArray(raw);
  if (list.length === 0) return undefined;
  return `${label} guidance:\n` + list.map((item) => `- ${item}`).join('\n');
}

function prosifyLayoutPrinciples(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ['gridSystem', 'spacingScale', 'whitespace', 'compositionRules']) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim().length > 0) parts.push(`${key}: ${v.trim()}`);
    else if (Array.isArray(v)) {
      const strs = v.filter((x): x is string => typeof x === 'string');
      if (strs.length > 0) parts.push(`${key}: ${strs.join(', ')}`);
    }
  }
  return parts.length > 0 ? parts.join('\n') : undefined;
}

function prosifyGraphicElements(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ['shapes', 'decorative', 'visualDevices']) {
    const v = obj[key];
    const arr = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    if (arr.length > 0) parts.push(`${key}: ${arr.join(', ')}`);
  }
  return parts.length > 0 ? parts.join('\n') : undefined;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}
