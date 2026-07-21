// =============================================================
// Brand-data import — gedeelde service achter de MCP-tool
// `import_brand_data` én lokale import-scripts (werkbestand-flow,
// docs/templates/werkbestand-merkonderdelen.md).
//
// Idempotent: upserts op natuurlijke sleutels (workspaceId+slug voor
// brand assets/concurrenten, naam/titel-match voor personas, producten,
// trends en kennisbronnen; BrandVoiceguide is 1-op-1 met workspace).
// Vergrendelde records (isLocked) worden overgeslagen, nooit overschreven.
// Ontbrekende velden in de payload blijven onaangeroerd — de import
// merge't, hij reset niet.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { CompetitorTier, Prisma } from '@prisma/client';
import { CANONICAL_BRAND_ASSETS } from '@/lib/constants/canonical-brand-assets';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { invalidateBrandContext } from '@/lib/ai/brand-context';

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
  category?: string;
  impact?: string;
  timeframe?: string;
  direction?: string;
  keyInsights?: string;
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
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
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

// ─── Sectie-importers ────────────────────────────────────────

async function importBrandAssets(
  workspaceId: string,
  assets: BrandAssetImport[],
  report: BrandImportReport,
): Promise<void> {
  for (const asset of assets) {
    const canonical = CANONICAL_BRAND_ASSETS.find((c) => c.slug === asset.slug);
    if (!canonical) {
      push(report, 'brandAssets', asset.slug, 'skipped', `onbekende asset-slug — geldige slugs: ${CANONICAL_BRAND_ASSETS.map((c) => c.slug).join(', ')}`);
      continue;
    }
    const existing = await prisma.brandAsset.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: asset.slug } },
    });
    if (existing?.isLocked) {
      push(report, 'brandAssets', canonical.name, 'skipped', 'asset is vergrendeld (isLocked)');
      continue;
    }
    if (existing) {
      const merged = {
        ...(existing.frameworkData as Record<string, unknown> | null ?? {}),
        ...asset.frameworkData,
      };
      await prisma.brandAsset.update({
        where: { id: existing.id },
        data: compact({
          frameworkData: merged as Prisma.InputJsonValue,
          content: asset.content !== undefined ? (asset.content as Prisma.InputJsonValue) : undefined,
          status: existing.status === 'DRAFT' ? 'IN_PROGRESS' : undefined,
        }),
      });
      push(report, 'brandAssets', canonical.name, 'updated');
    } else {
      await prisma.brandAsset.create({
        data: {
          workspaceId,
          name: canonical.name,
          slug: canonical.slug,
          category: canonical.category as never,
          description: canonical.description,
          frameworkType: canonical.frameworkType,
          frameworkData: asset.frameworkData as Prisma.InputJsonValue,
          content: asset.content !== undefined ? (asset.content as Prisma.InputJsonValue) : undefined,
          status: 'IN_PROGRESS',
        },
      });
      push(report, 'brandAssets', canonical.name, 'created');
    }
  }
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
  await prisma.brandVoiceguide.upsert({
    where: { workspaceId },
    update: data,
    create: { workspaceId, ...data },
  });
  push(report, 'voiceguide', 'Brand Voiceguide', existing ? 'updated' : 'created');
}

async function importPersonas(
  workspaceId: string,
  personas: PersonaImport[],
  report: BrandImportReport,
  userId?: string,
): Promise<void> {
  const actorId = await resolveActorUserId(workspaceId, userId);
  for (const p of personas) {
    const existing = await prisma.persona.findFirst({
      where: { workspaceId, name: { equals: p.name, mode: 'insensitive' } },
    });
    if (existing?.isLocked) {
      push(report, 'personas', p.name, 'skipped', 'persona is vergrendeld (isLocked)');
      continue;
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
  }
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
  for (const prod of products) {
    const existing = await prisma.product.findFirst({
      where: { workspaceId, name: { equals: prod.name, mode: 'insensitive' } },
    });
    if (existing?.isLocked) {
      push(report, 'products', prod.name, 'skipped', 'product is vergrendeld (isLocked)');
      continue;
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
      const slug = await uniqueProductSlug(slugify(prod.name));
      const created = await prisma.product.create({
        data: { workspaceId, name: prod.name, slug, source: 'MANUAL', ...data },
      });
      productId = created.id;
      push(report, 'products', prod.name, 'created');
    }
    for (const personaName of prod.personaNames ?? []) {
      const persona = await prisma.persona.findFirst({
        where: { workspaceId, name: { equals: personaName, mode: 'insensitive' } },
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
  }
}

async function importCompetitors(
  workspaceId: string,
  competitors: CompetitorImport[],
  report: BrandImportReport,
  userId?: string,
): Promise<void> {
  for (const comp of competitors) {
    const slug = slugify(comp.name);
    const existing = await prisma.competitor.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (existing?.isLocked) {
      push(report, 'competitors', comp.name, 'skipped', 'concurrent is vergrendeld (isLocked)');
      continue;
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
    } else {
      await prisma.competitor.create({
        data: { workspaceId, name: comp.name, slug, source: 'MANUAL', createdById: userId ?? null, ...data },
      });
      push(report, 'competitors', comp.name, 'created');
    }
  }
}

async function importTrends(
  workspaceId: string,
  trends: TrendImport[],
  report: BrandImportReport,
): Promise<void> {
  for (const trend of trends) {
    const existing = await prisma.trend.findFirst({
      where: { workspaceId, title: { equals: trend.title, mode: 'insensitive' } },
    });
    const data = compact({
      description: trend.description,
      category: trend.category,
      impact: trend.impact,
      timeframe: trend.timeframe,
      direction: trend.direction,
      keyInsights: trend.keyInsights,
      sources: trend.sources as unknown as Prisma.InputJsonValue | undefined,
    });
    if (existing) {
      await prisma.trend.update({ where: { id: existing.id }, data });
      push(report, 'trends', trend.title, 'updated');
    } else {
      await prisma.trend.create({
        data: { workspaceId, title: trend.title, ...data, description: trend.description },
      });
      push(report, 'trends', trend.title, 'created');
    }
  }
}

async function importKnowledgeResources(
  workspaceId: string,
  resources: KnowledgeResourceImport[],
  report: BrandImportReport,
): Promise<void> {
  for (const res of resources) {
    const existing = await prisma.knowledgeResource.findFirst({
      where: { workspaceId, title: { equals: res.title, mode: 'insensitive' } },
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
  }
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

  if (payload.contentLanguage) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { contentLanguage: payload.contentLanguage },
    });
    push(report, 'workspace', `contentLanguage → ${payload.contentLanguage}`, 'updated');
  }
  if (payload.brandAssets?.length) await importBrandAssets(workspaceId, payload.brandAssets, report);
  if (payload.voiceguide) await importVoiceguide(workspaceId, payload.voiceguide, report);
  if (payload.personas?.length) await importPersonas(workspaceId, payload.personas, report, opts?.userId);
  if (payload.products?.length) await importProducts(workspaceId, payload.products, report);
  if (payload.competitors?.length) await importCompetitors(workspaceId, payload.competitors, report, opts?.userId);
  if (payload.trends?.length) await importTrends(workspaceId, payload.trends, report);
  if (payload.knowledgeResources?.length) {
    await importKnowledgeResources(workspaceId, payload.knowledgeResources, report);
  }

  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
  invalidateCache(cacheKeys.prefixes.personas(workspaceId));
  invalidateCache(cacheKeys.prefixes.products(workspaceId));
  invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));
  invalidateCache(cacheKeys.prefixes.knowledgeResources(workspaceId));
  invalidateCache(cacheKeys.prefixes.competitors(workspaceId));
  invalidateCache(cacheKeys.prefixes.brandvoiceguide(workspaceId));
  invalidateBrandContext(workspaceId);

  return report;
}
