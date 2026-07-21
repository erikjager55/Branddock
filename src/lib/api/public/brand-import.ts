// =============================================================
// Brand-data import — gedeelde service achter de MCP-tool
// `import_brand_data` én lokale import-scripts (werkbestand-flow,
// docs/templates/werkbestand-merkonderdelen.md).
//
// Idempotent: upserts op natuurlijke sleutels (workspaceId+slug voor
// brand assets, naam/titel-match voor personas, producten, concurrenten,
// trends en kennisbronnen; BrandVoiceguide is 1-op-1 met workspace).
// Vergrendelde records (isLocked) worden overgeslagen, nooit overschreven.
// Ontbrekende velden in de payload blijven onaangeroerd — de import
// merge't (diep, voor frameworkData), hij reset niet.
//
// Concurrency-kanttekening: naam/titel-matches zijn geen DB-constraints;
// twee gelijktijdige imports op hetzelfde merk kunnen duplicaten geven.
// Unique-violations op de wél-geconstrainde sleutels (assets, product-slug)
// worden opgevangen en als update herprobeerd. De tool is bedoeld voor
// één werkbestand-import per merk tegelijk, niet voor parallelle bulk.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { CompetitorTier, InsightCategory, ImpactLevel, InsightTimeframe, Prisma } from '@prisma/client';
import { CANONICAL_BRAND_ASSETS } from '@/lib/constants/canonical-brand-assets';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { invalidateBrandContext } from '@/lib/ai/brand-context';
import { localeForLanguage, syncDefaultLocaleProfile } from '@/lib/content-locale/default-profile';
import { syncVoiceguideToRules } from '@/lib/brand-fidelity/brand-rule-sync';

/** Zelfde allowlist als POST/PATCH /api/workspaces — houd in sync. */
const VALID_CONTENT_LANGUAGES = new Set(['en', 'nl', 'de', 'fr', 'es', 'pt', 'it']);

// ─── Payload-types (spiegel van het werkbestand) ─────────────

export interface BrandAssetImport {
  /** Canonieke asset-slug, bijv. "golden-circle" (zie canonical-brand-assets.ts). */
  slug: string;
  /** Framework-velden — exacte keys per frameworkType (framework.types.ts). Wordt gemerged over bestaande data. */
  frameworkData: Record<string, unknown>;
  /** Optionele vrije-tekst aanvulling (BrandAsset.content). */
  content?: string;
}

export interface VoiceguideImport {
  voiceDescription?: string;
  /** NN/g 4-assen, elk 1-7 (4 = neutraal). */
  toneDimensions?: {
    formalCasual: number;
    seriousFunny: number;
    respectfulIrreverent: number;
    matterOfFactEnthusiastic: number;
  };
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  vocabularyDo?: string[];
  vocabularyDont?: string[];
  antiPatterns?: string[];
  examplePhrases?: Array<{ text: string; type: 'do' | 'dont' }>;
  voiceSample?: string;
  writingSamples?: string[];
  contentGuidelines?: string[];
  writingGuidelines?: string[];
  channelTones?: Partial<
    Record<'website' | 'socialMedia' | 'email' | 'ads' | 'video', { description: string }>
  >;
  contentLocale?: 'nl-NL' | 'nl-BE' | 'en-GB' | 'de-DE';
}

export interface PersonaImport {
  name: string;
  tagline?: string;
  age?: string;
  gender?: string;
  location?: string;
  occupation?: string;
  education?: string;
  income?: string;
  familyStatus?: string;
  personalityType?: string;
  bio?: string;
  quote?: string;
  coreValues?: string[];
  interests?: string[];
  goals?: string[];
  motivations?: string[];
  frustrations?: string[];
  behaviors?: string[];
  preferredChannels?: string[];
  techStack?: string[];
  buyingTriggers?: string[];
  decisionCriteria?: string[];
  strategicImplications?: string;
}

export interface ProductImport {
  name: string;
  category?: string;
  description?: string;
  pricingModel?: string;
  pricingDetails?: string;
  sourceUrl?: string;
  features?: string[];
  benefits?: string[];
  useCases?: string[];
  /** Namen van personas (uit dezelfde payload of al bestaand) om te koppelen. */
  personaNames?: string[];
}

export interface CompetitorImport {
  name: string;
  websiteUrl?: string;
  tier?: 'DIRECT' | 'INDIRECT' | 'ASPIRATIONAL';
  tagline?: string;
  headquarters?: string;
  employeeRange?: string;
  description?: string;
  valueProposition?: string;
  targetAudience?: string;
  mainOfferings?: string[];
  differentiators?: string[];
  strengths?: string[];
  weaknesses?: string[];
  pricingModel?: string;
  pricingDetails?: string;
  toneOfVoice?: string;
}

export interface TrendImport {
  title: string;
  description: string;
  /** DetectedTrend-categorie (Trend Radar). */
  category?: 'TECHNOLOGY' | 'CONSUMER_BEHAVIOR' | 'MARKET_DYNAMICS' | 'COMPETITIVE' | 'REGULATORY';
  impact?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  timeframe?: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  direction?: 'rising' | 'stable' | 'declining';
  /** Wat betekent deze trend voor het merk — landt in DetectedTrend.howToUse. */
  keyInsights?: string;
  /** Bron-URL's — landt in DetectedTrend.sourceUrls. */
  sources?: string[];
}

export interface KnowledgeResourceImport {
  title: string;
  description: string;
  type?: string;
  author?: string;
  url?: string;
  /** Volledige tekst-body — gaat mee in AI-context via de context registry. */
  content?: string;
}

export interface BrandImportPayload {
  /** ISO 639-1 workspace-taal, bijv. "nl" — zet Workspace.contentLanguage. */
  contentLanguage?: string;
  brandAssets?: BrandAssetImport[];
  voiceguide?: VoiceguideImport;
  personas?: PersonaImport[];
  products?: ProductImport[];
  competitors?: CompetitorImport[];
  trends?: TrendImport[];
  knowledgeResources?: KnowledgeResourceImport[];
}

export interface ImportItemResult {
  section: string;
  name: string;
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
}

export interface BrandImportReport {
  created: number;
  updated: number;
  skipped: number;
  items: ImportItemResult[];
}

// ─── Helpers ─────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'en')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
}

/**
 * Actor voor createdById-velden: expliciete userId, anders de owner van de
 * organisatie van de workspace (import-scripts en API-key-calls hebben geen
 * sessie-user).
 */
async function resolveActorUserId(workspaceId: string, userId?: string): Promise<string | null> {
  if (userId) return userId;
  const orgFilter = { organization: { workspaces: { some: { id: workspaceId } } } };
  const owner = await prisma.organizationMember.findFirst({ where: { ...orgFilter, role: 'owner' } });
  if (owner) return owner.userId;
  const member = await prisma.organizationMember.findFirst({ where: orgFilter });
  return member?.userId ?? null;
}

/** Verwijdert keys met undefined zodat Prisma-updates alleen aangeleverde velden raken. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Keys die op een object prototype-gedrag triggeren — nooit als data mergen. */
const UNSAFE_MERGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_MERGE_DEPTH = 20;

/**
 * Diepe merge voor frameworkData: geneste objecten (why/how/what, pillars,
 * anchorValue1, …) worden per key gemerged; arrays en scalars vervangen.
 * Zo wist een re-import met alleen `why.statement` niet de bestaande
 * `why.details`. Prototype-keys worden geskipt; voorbij MAX_MERGE_DEPTH
 * wordt vervangen i.p.v. gemerged (RangeError-bescherming op publieke input).
 */
function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (UNSAFE_MERGE_KEYS.has(key)) continue;
    const existing = out[key];
    out[key] =
      depth < MAX_MERGE_DEPTH && isPlainObject(existing) && isPlainObject(value)
        ? deepMerge(existing, value, depth + 1)
        : value;
  }
  return out;
}

/** Prisma P2002 (unique-constraint violation) — race met een parallelle create. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

/**
 * Itereert items met per-item foutisolatie: een falend item wordt als
 * 'skipped' (met foutreden) gerapporteerd en de rest van de sectie draait
 * door — het rapport verhult zo nooit welke items onverwerkt bleven.
 */
async function perItem<T>(
  items: T[],
  section: string,
  nameOf: (item: T) => string,
  report: BrandImportReport,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (const item of items) {
    try {
      await fn(item);
    } catch (err) {
      push(report, section, nameOf(item), 'skipped', `fout: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ─── Sectie-importers ────────────────────────────────────────

async function importBrandAssets(
  workspaceId: string,
  assets: BrandAssetImport[],
  report: BrandImportReport,
): Promise<void> {
  await perItem(assets, 'brandAssets', (a) => a.slug, report, async (asset) => {
    const canonical = CANONICAL_BRAND_ASSETS.find((c) => c.slug === asset.slug);
    if (!canonical) {
      push(report, 'brandAssets', asset.slug, 'skipped', `onbekende asset-slug — geldige slugs: ${CANONICAL_BRAND_ASSETS.map((c) => c.slug).join(', ')}`);
      return;
    }
    const existing = await prisma.brandAsset.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: asset.slug } },
    });
    if (existing?.isLocked) {
      push(report, 'brandAssets', canonical.name, 'skipped', 'asset is vergrendeld (isLocked)');
      return;
    }
    if (existing) {
      await applyAssetUpdate(existing, asset, canonical.name, report);
      return;
    }
    try {
      await prisma.brandAsset.create({
        data: {
          workspaceId,
          name: canonical.name,
          slug: canonical.slug,
          category: canonical.category,
          description: canonical.description,
          frameworkType: canonical.frameworkType,
          frameworkData: asset.frameworkData as Prisma.InputJsonValue,
          content: asset.content !== undefined ? (asset.content as Prisma.InputJsonValue) : undefined,
          status: 'IN_PROGRESS',
        },
      });
      push(report, 'brandAssets', canonical.name, 'created');
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Race met een parallelle create (bijv. workspace-provisioning) —
      // refetch en door hetzelfde locked+deep-merge-pad als een gewone update.
      const raced = await prisma.brandAsset.findUnique({
        where: { workspaceId_slug: { workspaceId, slug: asset.slug } },
      });
      if (!raced) throw err;
      if (raced.isLocked) {
        push(report, 'brandAssets', canonical.name, 'skipped', 'asset is vergrendeld (isLocked)');
        return;
      }
      await applyAssetUpdate(raced, asset, canonical.name, report);
    }
  });
}

/** Gedeeld update-pad voor bestaande assets (regulier én race-fallback). */
async function applyAssetUpdate(
  existing: { id: string; status: string; validatedCount: number; frameworkData: unknown },
  asset: BrandAssetImport,
  canonicalName: string,
  report: BrandImportReport,
): Promise<void> {
  const merged = deepMerge(
    (existing.frameworkData as Record<string, unknown> | null) ?? {},
    asset.frameworkData,
  );
  await prisma.brandAsset.update({
    where: { id: existing.id },
    data: compact({
      frameworkData: merged as Prisma.InputJsonValue,
      content: asset.content !== undefined ? (asset.content as Prisma.InputJsonValue) : undefined,
      status: existing.status === 'DRAFT' ? 'IN_PROGRESS' : undefined,
    }),
  });
  // Gevalideerde content wordt wél bijgewerkt (zelfde semantiek als de UI-
  // editor), maar de caller moet weten dat de validatiestatus dan content
  // attesteert die na de import gewijzigd is.
  const wasValidated = existing.status === 'READY' || existing.validatedCount > 0;
  push(
    report,
    'brandAssets',
    canonicalName,
    'updated',
    wasValidated
      ? `let op: asset had status ${existing.status} met validaties — content bijgewerkt, validatiestatus ongemoeid`
      : undefined,
  );
}

async function importVoiceguide(
  workspaceId: string,
  vg: VoiceguideImport,
  report: BrandImportReport,
): Promise<void> {
  const data = compact({
    voiceDescription: vg.voiceDescription,
    toneDimensions: vg.toneDimensions as Prisma.InputJsonValue | undefined,
    wordsWeUse: vg.wordsWeUse,
    wordsWeAvoid: vg.wordsWeAvoid,
    vocabularyDo: vg.vocabularyDo,
    vocabularyDont: vg.vocabularyDont,
    antiPatterns: vg.antiPatterns,
    examplePhrases: vg.examplePhrases as unknown as Prisma.InputJsonValue | undefined,
    voiceSample: vg.voiceSample,
    writingSamples: vg.writingSamples as unknown as Prisma.InputJsonValue | undefined,
    contentGuidelines: vg.contentGuidelines,
    writingGuidelines: vg.writingGuidelines,
    channelTones: vg.channelTones as unknown as Prisma.InputJsonValue | undefined,
    contentLocale: vg.contentLocale,
  });
  const existing = await prisma.brandVoiceguide.findUnique({ where: { workspaceId } });
  const saved = await prisma.brandVoiceguide.upsert({
    where: { workspaceId },
    update: data,
    create: { workspaceId, ...data },
  });

  // Tweede-deur-pariteit met PATCH /api/brandvoiceguide: wijzigingen in
  // wordsWeAvoid/antiPatterns voeden de BrandRule-auto-sync (F-VAL pijler 3).
  // Non-fataal — de import zelf slaagt ook als de sync faalt.
  let syncNote: string | undefined;
  if (vg.wordsWeAvoid !== undefined || vg.antiPatterns !== undefined) {
    try {
      await syncVoiceguideToRules(workspaceId, {
        wordsWeAvoid: saved.wordsWeAvoid,
        antiPatterns: saved.antiPatterns,
      });
    } catch (err) {
      syncNote = `BrandRule-sync faalde (niet-fataal): ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  if (!syncNote && vg.writingSamples !== undefined) {
    syncNote =
      'writingSamples gewijzigd — draai de centroid-recompute (Brand Voice → References) voor F-VAL pijler 1';
  }
  push(report, 'voiceguide', 'Brand Voiceguide', existing ? 'updated' : 'created', syncNote);
}

async function importPersonas(
  workspaceId: string,
  personas: PersonaImport[],
  report: BrandImportReport,
  userId?: string,
): Promise<void> {
  const actorId = await resolveActorUserId(workspaceId, userId);
  await perItem(personas, 'personas', (p) => p.name, report, async (p) => {
    const existing = await prisma.persona.findFirst({
      where: { workspaceId, name: { equals: p.name, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing?.isLocked) {
      push(report, 'personas', p.name, 'skipped', 'persona is vergrendeld (isLocked)');
      return;
    }
    const data = compact({
      tagline: p.tagline,
      age: p.age,
      gender: p.gender,
      location: p.location,
      occupation: p.occupation,
      education: p.education,
      income: p.income,
      familyStatus: p.familyStatus,
      personalityType: p.personalityType,
      bio: p.bio,
      quote: p.quote,
      coreValues: p.coreValues,
      interests: p.interests,
      goals: p.goals,
      motivations: p.motivations,
      frustrations: p.frustrations,
      behaviors: p.behaviors,
      preferredChannels: p.preferredChannels as unknown as Prisma.InputJsonValue | undefined,
      techStack: p.techStack as unknown as Prisma.InputJsonValue | undefined,
      buyingTriggers: p.buyingTriggers as unknown as Prisma.InputJsonValue | undefined,
      decisionCriteria: p.decisionCriteria as unknown as Prisma.InputJsonValue | undefined,
      strategicImplications: p.strategicImplications,
    });
    if (existing) {
      await prisma.persona.update({ where: { id: existing.id }, data });
      push(report, 'personas', p.name, 'updated');
    } else if (!actorId) {
      push(report, 'personas', p.name, 'skipped', 'geen gebruiker gevonden voor createdById');
    } else {
      await prisma.persona.create({ data: { workspaceId, name: p.name, createdById: actorId, ...data } });
      push(report, 'personas', p.name, 'created');
    }
  });
}

async function uniqueProductSlug(base: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const taken = await prisma.product.findUnique({ where: { slug } });
    if (!taken) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function importProducts(
  workspaceId: string,
  products: ProductImport[],
  report: BrandImportReport,
): Promise<void> {
  await perItem(products, 'products', (p) => p.name, report, async (prod) => {
    const existing = await prisma.product.findFirst({
      where: { workspaceId, name: { equals: prod.name, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing?.isLocked) {
      push(report, 'products', prod.name, 'skipped', 'product is vergrendeld (isLocked)');
      return;
    }
    const data = compact({
      category: prod.category,
      description: prod.description,
      pricingModel: prod.pricingModel,
      pricingDetails: prod.pricingDetails,
      sourceUrl: prod.sourceUrl,
      features: prod.features,
      benefits: prod.benefits,
      useCases: prod.useCases,
    });
    let productId: string;
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      productId = existing.id;
      push(report, 'products', prod.name, 'updated');
    } else {
      const base = slugify(prod.name);
      if (!base) {
        push(report, 'products', prod.name, 'skipped', 'geen stabiele slug afleidbaar uit de naam');
        return;
      }
      const slug = await uniqueProductSlug(base);
      try {
        const created = await prisma.product.create({
          data: { workspaceId, name: prod.name, slug, source: 'MANUAL', ...data },
        });
        productId = created.id;
        push(report, 'products', prod.name, 'created');
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        push(report, 'products', prod.name, 'skipped', 'slug-conflict door parallelle create — draai de import opnieuw');
        return;
      }
    }
    for (const personaName of prod.personaNames ?? []) {
      const persona = await prisma.persona.findFirst({
        where: { workspaceId, name: { equals: personaName, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      });
      if (!persona) {
        push(report, 'products', `${prod.name} → ${personaName}`, 'skipped', 'persona niet gevonden voor koppeling');
        continue;
      }
      await prisma.productPersona.createMany({
        data: [{ productId, personaId: persona.id }],
        skipDuplicates: true,
      });
    }
  });
}

/**
 * Zelfde algoritme als POST /api/competitors (route.ts) zodat import en UI
 * dezelfde slug voor dezelfde naam opleveren. Lege slug (naam zonder
 * a-z0-9) → null: caller slaat over i.p.v. een instabiele fallback te maken.
 */
function competitorSlug(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || null;
}

async function importCompetitors(
  workspaceId: string,
  competitors: CompetitorImport[],
  report: BrandImportReport,
  userId?: string,
): Promise<void> {
  await perItem(competitors, 'competitors', (c) => c.name, report, async (comp) => {
    // Naam-match (net als personas/producten): idempotent tegen zowel eerdere
    // imports als via de UI aangemaakte concurrenten, ongeacht slug-varianten.
    const existing = await prisma.competitor.findFirst({
      where: { workspaceId, name: { equals: comp.name, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing?.isLocked) {
      push(report, 'competitors', comp.name, 'skipped', 'concurrent is vergrendeld (isLocked)');
      return;
    }
    const data = compact({
      websiteUrl: comp.websiteUrl,
      tier: comp.tier as CompetitorTier | undefined,
      tagline: comp.tagline,
      headquarters: comp.headquarters,
      employeeRange: comp.employeeRange,
      description: comp.description,
      valueProposition: comp.valueProposition,
      targetAudience: comp.targetAudience,
      mainOfferings: comp.mainOfferings,
      differentiators: comp.differentiators,
      strengths: comp.strengths,
      weaknesses: comp.weaknesses,
      pricingModel: comp.pricingModel,
      pricingDetails: comp.pricingDetails,
      toneOfVoice: comp.toneOfVoice,
    });
    if (existing) {
      await prisma.competitor.update({ where: { id: existing.id }, data });
      push(report, 'competitors', comp.name, 'updated');
      return;
    }
    const base = competitorSlug(comp.name);
    if (!base) {
      push(report, 'competitors', comp.name, 'skipped', 'geen stabiele slug afleidbaar uit de naam');
      return;
    }
    let slug: string = base;
    const slugTaken = await prisma.competitor.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
      select: { id: true },
    });
    if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`;
    try {
      await prisma.competitor.create({
        data: { workspaceId, name: comp.name, slug, source: 'MANUAL', createdById: userId ?? null, ...data },
      });
      push(report, 'competitors', comp.name, 'created');
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      push(report, 'competitors', comp.name, 'skipped', 'slug-conflict door parallelle create — draai de import opnieuw');
    }
  });
}

/** Zelfde slug-algoritme als POST /api/trend-radar/manual (DetectedTrend.slug is globaal uniek). */
async function uniqueTrendSlug(title: string): Promise<string | null> {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  if (!base) return null;
  let slug = base;
  for (let attempt = 1; attempt < 50; attempt++) {
    const taken = await prisma.detectedTrend.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base}-${attempt}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Trends landen in DetectedTrend — het model dat de Trend Radar-UI én
// getBrandContext lezen (het oude Trend-model is legacy en nergens zichtbaar).
async function importTrends(
  workspaceId: string,
  trends: TrendImport[],
  report: BrandImportReport,
  userId?: string,
): Promise<void> {
  const actorId = await resolveActorUserId(workspaceId, userId);
  await perItem(trends, 'trends', (t) => t.title, report, async (trend) => {
    const existing = await prisma.detectedTrend.findFirst({
      where: { workspaceId, title: { equals: trend.title, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing?.isLocked) {
      push(report, 'trends', trend.title, 'skipped', 'trend is vergrendeld (isLocked)');
      return;
    }
    const data = compact({
      description: trend.description,
      category: trend.category as InsightCategory | undefined,
      impactLevel: trend.impact as ImpactLevel | undefined,
      timeframe: trend.timeframe as InsightTimeframe | undefined,
      direction: trend.direction,
      howToUse: trend.keyInsights !== undefined ? [trend.keyInsights] : undefined,
      sourceUrls: trend.sources,
    });
    if (existing) {
      await prisma.detectedTrend.update({ where: { id: existing.id }, data });
      push(report, 'trends', trend.title, 'updated');
      return;
    }
    const slug = await uniqueTrendSlug(trend.title);
    if (!slug) {
      push(report, 'trends', trend.title, 'skipped', 'geen stabiele slug afleidbaar uit de titel');
      return;
    }
    const createData: Prisma.DetectedTrendUncheckedCreateInput = {
      workspaceId,
      title: trend.title,
      slug,
      detectionSource: 'MANUAL',
      isActivated: true,
      activatedAt: new Date(),
      activatedById: actorId,
      description: trend.description,
      // Zelfde default als POST /api/trend-radar/manual (category is verplicht).
      category: trend.category ?? 'TECHNOLOGY',
    };
    if (trend.impact !== undefined) createData.impactLevel = trend.impact;
    if (trend.timeframe !== undefined) createData.timeframe = trend.timeframe;
    if (trend.direction !== undefined) createData.direction = trend.direction;
    if (trend.keyInsights !== undefined) createData.howToUse = [trend.keyInsights];
    if (trend.sources !== undefined) createData.sourceUrls = trend.sources;
    try {
      await prisma.detectedTrend.create({ data: createData });
      push(report, 'trends', trend.title, 'created');
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      push(report, 'trends', trend.title, 'skipped', 'slug-conflict door parallelle create — draai de import opnieuw');
    }
  });
}

async function importKnowledgeResources(
  workspaceId: string,
  resources: KnowledgeResourceImport[],
  report: BrandImportReport,
): Promise<void> {
  await perItem(resources, 'knowledgeResources', (r) => r.title, report, async (res) => {
    const existing = await prisma.knowledgeResource.findFirst({
      where: { workspaceId, title: { equals: res.title, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    const data = compact({
      description: res.description,
      type: res.type,
      author: res.author,
      url: res.url,
      content: res.content,
    });
    if (existing) {
      await prisma.knowledgeResource.update({ where: { id: existing.id }, data });
      push(report, 'knowledgeResources', res.title, 'updated');
    } else {
      await prisma.knowledgeResource.create({
        data: { workspaceId, title: res.title, source: 'MANUAL', ...data, description: res.description },
      });
      push(report, 'knowledgeResources', res.title, 'created');
    }
  });
}

function push(
  report: BrandImportReport,
  section: string,
  name: string,
  action: ImportItemResult['action'],
  reason?: string,
): void {
  report.items.push({ section, name, action, ...(reason ? { reason } : {}) });
  if (action === 'created') report.created++;
  else if (action === 'updated') report.updated++;
  else report.skipped++;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Importeert merkonderdelen (werkbestand-payload) idempotent in een workspace.
 * Alleen aangeleverde secties/velden worden geraakt; vergrendelde records
 * worden overgeslagen en gerapporteerd. Invalideert na afloop alle geraakte
 * server-side caches én de brand-context-cache.
 */
export async function importBrandData(
  workspaceId: string,
  payload: BrandImportPayload,
  opts?: { userId?: string },
): Promise<BrandImportReport> {
  const report: BrandImportReport = { created: 0, updated: 0, skipped: 0, items: [] };

  // Eén sectie-fout mag de rest niet meeslepen: de fout wordt gerapporteerd
  // en de overige secties draaien door (geen transactie — zie header).
  const runSection = async (section: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      push(report, section, 'sectie-fout', 'skipped', err instanceof Error ? err.message : String(err));
    }
  };

  try {
    if (payload.contentLanguage) {
      await runSection('workspace', async () => {
        const lang = payload.contentLanguage!;
        if (!VALID_CONTENT_LANGUAGES.has(lang)) {
          push(report, 'workspace', `contentLanguage → ${lang}`, 'skipped', `ongeldige taalcode — toegestaan: ${[...VALID_CONTENT_LANGUAGES].join(', ')}`);
          return;
        }
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { contentLanguage: lang },
        });
        // Content-locale anker (ADR 2026-07-16): zelfde flankerende sync als
        // PATCH /api/workspaces — zonder deze draait repair-anchors de
        // taalwijziging later terug naar het oude default-profiel.
        await syncDefaultLocaleProfile(workspaceId, localeForLanguage(lang));
        push(report, 'workspace', `contentLanguage → ${lang}`, 'updated');
      });
    }
    if (payload.brandAssets?.length) {
      await runSection('brandAssets', () => importBrandAssets(workspaceId, payload.brandAssets!, report));
    }
    if (payload.voiceguide) {
      await runSection('voiceguide', () => importVoiceguide(workspaceId, payload.voiceguide!, report));
    }
    if (payload.personas?.length) {
      await runSection('personas', () => importPersonas(workspaceId, payload.personas!, report, opts?.userId));
    }
    if (payload.products?.length) {
      await runSection('products', () => importProducts(workspaceId, payload.products!, report));
    }
    if (payload.competitors?.length) {
      await runSection('competitors', () =>
        importCompetitors(workspaceId, payload.competitors!, report, opts?.userId),
      );
    }
    if (payload.trends?.length) {
      await runSection('trends', () => importTrends(workspaceId, payload.trends!, report, opts?.userId));
    }
    if (payload.knowledgeResources?.length) {
      await runSection('knowledgeResources', () =>
        importKnowledgeResources(workspaceId, payload.knowledgeResources!, report),
      );
    }
  } finally {
    // Ook na een partiële import mogen er geen stale caches achterblijven.
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    invalidateCache(cacheKeys.prefixes.personas(workspaceId));
    invalidateCache(cacheKeys.prefixes.products(workspaceId));
    invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));
    invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));
    invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
    invalidateCache(cacheKeys.prefixes.brandvoiceguide(workspaceId));
    invalidateBrandContext(workspaceId);
  }

  return report;
}
