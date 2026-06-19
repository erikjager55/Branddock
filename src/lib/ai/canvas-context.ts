// =============================================================
// Canvas Context Stack Assembly
//
// Assembles a 5-layer context stack for a given deliverable:
//   Layer 1 — Brand context (reuses getBrandContext())
//   Layer 2 — Campaign concept (from campaign.strategy JSON)
//   Layer 3 — Journey phase (auto-derived from settings + blueprint)
//   Layer 4 — Medium enrichment (from MediumEnrichment table)
//   Layer 5 — The deliverable itself (components) — not in this stack
//
// This module is server-only (imports Prisma).
// =============================================================

import { prisma } from '@/lib/prisma';
import { getBrandContext } from './brand-context';
import type { BrandContextBlock } from './prompt-templates';
import { detectJourneyPhase, type JourneyPhaseContext } from '@/lib/campaigns/journey-phase';
import { serializePersona } from './context/persona-serializer';
import { getAvailableContextItems } from './context/fetcher';
import {
  extractBrandTokensWithProvenance,
  type BrandTokens,
} from '@/lib/landing-pages/brand-tokens';
import type { TokenProvenance } from '@/lib/landing-pages/token-provenance';
import { parseBrandImages, type BrandImage } from '@/lib/landing-pages/brand-images';

// ─── Types ───────────────────────────────────────────────────

export interface ConceptContext {
  campaignTheme: string | null;
  positioningStatement: string | null;
  strategicApproach: string | null;
  keyMessages: string[];
  targetAudienceInsights: string | null;
  humanInsight: string | null;
  creativePlatform: string | null;
}

export interface MediumContext {
  platform: string;
  format: string;
  specs: Record<string, unknown>;
  componentTemplate: unknown[];
  bestPractices: string[];
  phaseGuidance: Record<string, unknown> | null;
  optimalPublishTimes: Record<string, unknown> | null;
}

export interface PersonaContext {
  id: string;
  name: string;
  serialized: string;
  /** Avatar URL voor visual use (TestimonialBlock). Null wanneer geen avatar
   *  geüpload (renderer toont initial-fallback). */
  avatarUrl: string | null;
}

export interface BriefContext {
  objective: string | null;
  keyMessage: string | null;
  toneDirection: string | null;
  callToAction: string | null;
  contentOutline: string[];
}

/**
 * Visual style chips — a finite vocabulary that scopes both text-prompt
 * style direction AND image-prompt composition guidance. The orchestrator
 * has rich per-chip mappings (see canvas-orchestrator.ts) so picking
 * "infographic" emits different instructions to Claude/DALL-E than
 * "lifestyle". Free text is allowed via styleDirectionFreeText.
 */
export type VisualStyleDirection =
  | 'lifestyle'
  | 'product-shot'
  | 'quote-text'
  | 'behind-the-scenes'
  | 'ugc'
  | 'infographic'
  | 'illustration'
  | 'data-driven';

/**
 * How the visual for this content item gets sourced.
 *
 * F35 (audit 2026-05-13): unified image-flow. Voorheen waren upload/url/stock
 * alleen bereikbaar via Step 3 InsertImageModal (los van visualBrief); nu
 * eerste-class sources in Visual Brief zodat Step 2 + Step 3 één panel
 * delen met visualBrief.source als single source of truth.
 *
 *  - `generate`            — AI from prompt (Imagen / DALL-E / FLUX / Recraft / Ideogram)
 *  - `library`             — existing MediaAsset (IMAGE type)
 *  - `upload`              — user uploads a new file
 *  - `url`                 — paste a public image URL
 *  - `stock`               — Pexels search + import
 *  - `compose`             — 2-9 reference MediaAssets via FLUX 2 multi-reference
 *  - `trained-style`       — workspace-trained LoRA / consistent model
 *  - `photography-request` — F42: AI genereert fotograaf-briefing voor real-photo
 *                            workflow; user upload-after-photo
 *  - `none`                — skip image generation for this content item
 */
export type VisualBriefSource =
  | 'generate'
  | 'library'
  | 'upload'
  | 'url'
  | 'stock'
  | 'smart-search'
  | 'compose'
  | 'trained-style'
  | 'photography-request'
  | 'none';

/**
 * Strategic visual direction set in Step 1 of the Canvas. Replaces the
 * previous tag-only `visualStyle` / `visualDirection` / `contentStyle`
 * fields scattered across content-type-inputs that asked similar things
 * in incompatible formats.
 *
 * The Visual Brief lives in `settings.visualBrief` (Json on Deliverable)
 * and flows through to the orchestrator via assembleCanvasContext.
 */
export interface VisualBrief {
  source: VisualBriefSource;
  /** One of the canonical style chips — null when not chosen. */
  styleDirection: VisualStyleDirection | null;
  /** Free-text style notes — used when none of the chips fit. */
  styleDirectionFreeText: string | null;
  /**
   * Concrete subject-omschrijving — what the image MUST depict (who,
   * where, what, mood). Overrules keyMessage as the subject-seed when
   * present. Distinct from styleDirectionFreeText (style hints) — see
   * canvas-image-briefing-textarea task decision 2026-05-08.
   */
  briefingText?: string | null;
  /** Per-source config blocks — only the active source's block is read. */
  generate?: {
    /** Image model preference (imagen-4 / dall-e-3 / flux-pro / recraft / ideogram). */
    model?: string;
    /** Override the AI-derived image prompt with explicit user prose. */
    promptOverride?: string;
  };
  library?: {
    /** MediaAsset IDs picked from the library — used directly as image variants. */
    assetIds: string[];
  };
  compose?: {
    /** 2-9 reference MediaAsset IDs fed to FLUX 2 multi-reference compositing. */
    referenceIds: string[];
    /** Natural-language compose instruction (e.g. "Sarah holding the product in a coffee shop"). */
    instruction: string;
  };
  trained?: {
    /** ConsistentModel ID — the user's trained LoRA for branded photography / illustration / etc. */
    modelId: string;
    /** Style strength 0-100. */
    strength?: number;
  };
}

/** W2 (plan §2.3) — productbeeld voor de product-page beeld-pijplijn. `category`
 *  is de ProductImageCategory-string (HERO/FEATURE/DETAIL/LIFESTYLE/…). */
export interface ProductImageContext {
  url: string;
  category: string;
  altText: string | null;
  sortOrder: number;
}

export interface ProductContext {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricingModel: string | null;
  pricingDetails: string | null;
  features: string[];
  benefits: string[];
  useCases: string[];
  /** W2 — gescrapte/geüploade productbeelden, op sortOrder gesorteerd. Leeg
   *  wanneer het product geen beelden heeft (34/39 producten vandaag). */
  images: ProductImageContext[];
}

export interface CanvasContextStack {
  brand: BrandContextBlock;
  concept: ConceptContext | null;
  journeyPhase: JourneyPhaseContext | null;
  medium: MediumContext | null;
  deliverableTypeId: string | null;
  personas: PersonaContext[];
  brief: BriefContext | null;
  products: ProductContext[];
  /** Type-specific inputs (SEO keywords, landing page URL, event details, etc.) */
  contentTypeInputs?: Record<string, string | string[] | number | boolean>;
  /** Strategic visual direction for this content item — see VisualBrief. */
  visualBrief?: VisualBrief | null;
  /**
   * User-selected knowledge-context items (Step 1 picker), persisted on
   * `settings.additionalContextItems`. Hydrated into the Canvas store so the
   * selection survives reload / tab-switch / server-side regeneration.
   */
  additionalContextItems?: {
    sourceType: string;
    sourceId: string;
    title: string;
    note?: string;
    priority?: 'primary' | 'reference';
  }[];
  /**
   * Puck data-tree for web-page content-types (landing-page / product-page /
   * faq-page / comparison-page / microsite). Stored on `deliverable.settings.puckData`
   * and hydrated into the Canvas store via `setContextStack`. Null when the
   * deliverable hasn't been edited in the Puck builder yet — caller seeds
   * from variantToPuckData() at that point.
   */
  puckData?: unknown;
  /**
   * Structurally-extracted brand tokens (primary/secondary/accent/neutral
   * hex + heading/body font-family). Loaded server-side from BrandStyleguide
   * + StyleguideFont per ADR 2026-05-22-landing-page-builder-architectuur.
   * Always present (uses Branddock defaults when no styleguide exists), so
   * downstream consumers never branch on null.
   */
  brandTokens: BrandTokens;
  /**
   * V1 (governed-token-layer) — herkomst-sidecar bij `brandTokens`: per token
   * de source (scraped/logo/preset/fallback/derived) + confidence + bewijs.
   * Voedt de provenance-footer (V3) en de preset-degradatie (V2). Optioneel:
   * niet alle context-stack-constructors (tests/mocks) leveren het.
   */
  brandProvenance?: TokenProvenance;
  /**
   * P2 — brand-eigen beelden (gescraped/geüpload) uit `BrandStyleguide.brandImages`.
   * Voedt de beeld-producer (`assignBrandImagesToVariant`) zodat hero/feature-
   * slots zonder beeld met echte merk-foto's gevuld worden. Leeg = geen bronbeeld.
   */
  brandImages?: BrandImage[];
  /**
   * W4-fix — URL van het merklogo voor het brand-slot van de AnchorNav/BrandNav
   * (LOCKUP/PRIMARY/WORDMARK-voorkeur). Null wanneer de workspace geen logo heeft
   * → de nav valt terug op de merknaam als tekst.
   */
  brandNavLogoUrl?: string | null;
  /**
   * Brand-meta voor V2 lazy-inference gates (geen render-impact). Bevat
   * flags die onderscheid maken tussen schema-default sentinels en
   * expliciet inferred / user-set waardes.
   */
  brandStyleguideMeta?: {
    /** True wanneer layoutStyle is geïnferred of door user overruled.
     *  False = nog schema-default → ensureLayoutStyle mag draaien. */
    layoutStyleInferred: boolean;
  };
}

// ─── Content Type → Platform/Format Mapping ──────────────────
// Maps deliverable.contentType IDs to MediumEnrichment platform+format.

const CONTENT_TYPE_TO_MEDIUM: Record<string, { platform: string; format: string }> = {
  // Social
  'linkedin-post': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-article': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-carousel': { platform: 'linkedin', format: 'carousel' },
  'linkedin-ad': { platform: 'linkedin', format: 'ad' },
  // 2026-05-19: paid video-ad — apart van organic 'linkedin-video' zodat
  // publish-timing checklist + canvas-orchestrator video-script branch
  // niet hoeven branchen op format-string. Eigen content-type heeft eigen
  // medium-format 'video-ad'.
  'linkedin-video-ad': { platform: 'linkedin', format: 'video-ad' },
  'linkedin-newsletter': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-video': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-event': { platform: 'linkedin', format: 'organic-post' },
  'linkedin-poll': { platform: 'linkedin', format: 'poll-post' },
  'instagram-post': { platform: 'instagram', format: 'feed-post' },
  'social-carousel': { platform: 'instagram', format: 'carousel' },
  'tiktok-script': { platform: 'tiktok', format: 'video' },
  'facebook-post': { platform: 'facebook', format: 'organic-post' },
  'facebook-ad': { platform: 'facebook', format: 'ad' },
  'display-ad': { platform: 'google', format: 'display-ad' },
  'search-ad': { platform: 'google', format: 'search-ad' },
  'native-ad': { platform: 'native', format: 'sponsored-article' },
  'retargeting-ad': { platform: 'meta', format: 'retargeting' },
  'twitter-thread': { platform: 'x', format: 'thread' },
  // Ads
  'social-ad': { platform: 'linkedin', format: 'ad' },
  // Email
  // Sequences keep the email/newsletter mapping for deliverability specs +
  // best practices, but their component contract comes from the fallback
  // registry: FALLBACK_FIRST_TYPES (component-templates-fallback.ts) makes
  // the orchestrator override ONLY the row's componentTemplate (audit C4 —
  // the newsletter row forced 5-7 emails into one body field).
  'newsletter': { platform: 'email', format: 'newsletter' },
  'welcome-sequence': { platform: 'email', format: 'newsletter' },
  'promotional-email': { platform: 'email', format: 'newsletter' },
  'nurture-sequence': { platform: 'email', format: 'newsletter' },
  're-engagement-email': { platform: 'email', format: 'newsletter' },
  // Web — landing/product pages (hero + CTA focused)
  // faq/comparison/microsite intentionally stay on web/landing-page: the
  // medium row supplies layout-context (specs, best practices, preview/Puck
  // routing). Their type-specific component groups come from the fallback
  // registry via FALLBACK_FIRST_TYPES, which overrides only the row's
  // componentTemplate (audit C5 — no slot for Q&A pairs/matrix/pages).
  'landing-page': { platform: 'web', format: 'landing-page' },
  'product-page': { platform: 'web', format: 'landing-page' },
  'faq-page': { platform: 'web', format: 'landing-page' },
  'comparison-page': { platform: 'web', format: 'landing-page' },
  'microsite': { platform: 'web', format: 'landing-page' },
  // Long-form content (narrative focused, no hero)
  'blog-post': { platform: 'web', format: 'blog-article' },
  'pillar-page': { platform: 'web', format: 'blog-article' },
  'article': { platform: 'web', format: 'blog-article' },
  'thought-leadership': { platform: 'web', format: 'blog-article' },
  'whitepaper': { platform: 'web', format: 'blog-article' },
  'case-study': { platform: 'web', format: 'blog-article' },
  'ebook': { platform: 'web', format: 'blog-article' },
  // Sales enablement + PR/HR — no MediumEnrichment rows are seeded for
  // these platform/format combos; the mappings allow future (workspace)
  // rows to take over, until then the fallback registry supplies the
  // component groups (audit C3).
  'one-pager': { platform: 'sales', format: 'one-pager' },
  'sales-deck': { platform: 'sales', format: 'sales-deck' },
  'proposal-template': { platform: 'sales', format: 'proposal' },
  'product-description': { platform: 'sales', format: 'product-description' },
  // PR, HR & Comms
  'press-release': { platform: 'pr', format: 'press-release' },
  'media-pitch': { platform: 'pr', format: 'media-pitch' },
  'internal-comms': { platform: 'pr', format: 'internal-comms' },
  'career-page': { platform: 'pr', format: 'career-page' },
  'job-ad-copy': { platform: 'pr', format: 'job-ad' },
  'employee-story': { platform: 'pr', format: 'employee-story' },
  'impact-report': { platform: 'pr', format: 'impact-report' },
  // Video
  'video-ad': { platform: 'tiktok', format: 'video' },
};

// ─── Layer Builders ──────────────────────────────────────────

function extractConceptContext(strategyJson: unknown): ConceptContext | null {
  if (!strategyJson || typeof strategyJson !== 'object') return null;
  const s = strategyJson as Record<string, unknown>;

  // Try blueprint structure first
  const strategy = (s.strategy ?? s.strategyLayer ?? s) as Record<string, unknown>;

  const campaignTheme = (strategy.campaignTheme ?? strategy.theme ?? null) as string | null;
  const positioningStatement = (strategy.positioningStatement ?? null) as string | null;
  const strategicApproach = (strategy.strategicApproach ?? strategy.approach ?? null) as string | null;
  const keyMessages = Array.isArray(strategy.keyMessages) ? strategy.keyMessages.filter((m): m is string => typeof m === 'string') : [];
  const targetAudienceInsights = (strategy.targetAudienceInsights ?? null) as string | null;
  const humanInsight = (strategy.humanInsight ?? null) as string | null;
  const creativePlatform = (strategy.creativePlatform ?? null) as string | null;

  // Return null if nothing useful
  if (!campaignTheme && !positioningStatement && !strategicApproach && keyMessages.length === 0) {
    return null;
  }

  return {
    campaignTheme,
    positioningStatement,
    strategicApproach,
    keyMessages,
    targetAudienceInsights,
    humanInsight,
    creativePlatform,
  };
}

async function fetchMediumContext(
  platform: string,
  format: string,
  workspaceId: string,
  phase: string | null,
): Promise<MediumContext | null> {
  // Try workspace-specific override first, then system default.
  // PostgreSQL DESC puts NULLs first by default, so we explicitly use nulls: 'last'
  // to ensure workspace-specific records (non-null) come before system defaults (null).
  const enrichment = await prisma.mediumEnrichment.findFirst({
    where: {
      platform,
      format,
      OR: [
        { workspaceId },
        { workspaceId: null },
      ],
    },
    orderBy: { workspaceId: { sort: 'desc', nulls: 'last' } },
  });

  if (!enrichment) return null;

  const phaseGuidance = enrichment.phaseGuidance as Record<string, Record<string, unknown>> | null;
  const currentPhaseGuidance = phase && phaseGuidance ? (phaseGuidance[phase] ?? null) : null;

  return {
    platform: enrichment.platform,
    format: enrichment.format,
    specs: enrichment.specs as Record<string, unknown>,
    componentTemplate: enrichment.componentTemplate as unknown[],
    bestPractices: Array.isArray(enrichment.bestPractices) ? enrichment.bestPractices as string[] : [],
    phaseGuidance: currentPhaseGuidance as Record<string, unknown> | null,
    optimalPublishTimes: enrichment.optimalPublishTimes as Record<string, unknown> | null,
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Assemble the 5-layer context stack for a given deliverable.
 * Layers 1-4 are returned; Layer 5 (the deliverable itself) is handled by the caller.
 */
export async function assembleCanvasContext(
  deliverableId: string,
  workspaceId: string,
): Promise<CanvasContextStack> {
  // Fetch deliverable with campaign
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      campaign: {
        select: {
          strategy: true,
        },
      },
    },
  });

  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found`);
  }

  const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
  const settingsBrief = (settings.brief ?? {}) as Record<string, unknown>;
  const settingsPhase = (deliverable.journeyPhase ?? settings.phase ?? null) as string | null;

  // Layer 1: Brand context (cached, 5-min TTL)
  const brand = await getBrandContext(workspaceId);

  // Layer 2: Campaign concept from strategy JSON
  const concept = extractConceptContext(deliverable.campaign.strategy);

  // Layer 3: Journey phase (explicit from settings, or derived from blueprint)
  const journeyPhase = detectJourneyPhase(
    settingsPhase ?? undefined,
    deliverable.campaign.strategy,
    deliverable.weekInCampaign ?? undefined,
    deliverable.title ?? undefined,
    deliverable.contentType ?? undefined,
  );

  // Layer 4: Medium enrichment
  let medium: MediumContext | null = null;
  const mediumMapping = CONTENT_TYPE_TO_MEDIUM[deliverable.contentType];
  if (mediumMapping) {
    medium = await fetchMediumContext(
      mediumMapping.platform,
      mediumMapping.format,
      workspaceId,
      journeyPhase?.phase ?? null,
    );
  }

  // Layer 5: Target personas
  let targetPersonaIds: string[] = [];
  if (Array.isArray(settings.targetPersonas)) {
    targetPersonaIds = (settings.targetPersonas as unknown[]).filter((id): id is string => typeof id === 'string');
  }

  // Fallback: fetch persona IDs from campaign knowledge assets
  if (targetPersonaIds.length === 0) {
    // Match on personaId presence, NOT assetType — the latter is free-text and
    // was written capitalized ('Persona') while this query used lowercase
    // 'persona', so the fallback silently matched nothing (casing bug fixed).
    const knowledgeAssets = await prisma.campaignKnowledgeAsset.findMany({
      where: { campaignId: deliverable.campaignId, personaId: { not: null } },
      select: { personaId: true },
    });
    targetPersonaIds = knowledgeAssets
      .map((ka) => ka.personaId)
      .filter((id): id is string => id !== null);
  }

  const personas: PersonaContext[] = [];
  if (targetPersonaIds.length > 0) {
    const personaRecords = await prisma.persona.findMany({
      where: { id: { in: targetPersonaIds }, workspaceId },
    });
    for (const p of personaRecords) {
      const record = p as unknown as Record<string, unknown>;
      personas.push({
        id: p.id,
        name: p.name,
        serialized: serializePersona(record),
        avatarUrl: p.avatarUrl ?? null,
      });
    }
  }

  // Layer 6: Brief context from deliverable settings
  const brief: BriefContext | null = (() => {
    const objective = (settingsBrief.objective ?? null) as string | null;
    const keyMessage = (settingsBrief.keyMessage ?? null) as string | null;
    const toneDirection = (settingsBrief.toneDirection ?? null) as string | null;
    const callToAction = (settingsBrief.callToAction ?? null) as string | null;
    const contentOutline = Array.isArray(settingsBrief.contentOutline)
      ? (settingsBrief.contentOutline as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];
    if (!objective && !keyMessage && !toneDirection && !callToAction && contentOutline.length === 0) {
      return null;
    }
    return { objective, keyMessage, toneDirection, callToAction, contentOutline };
  })();

  // Layer 7: Product context. W2 (plan §2.3) — settings-first: een product-page
  // koppelt expliciet via settings.contentTypeInputs.productId (de product-select
  // dropdown). Die wint en wordt workspace-gevalideerd. Valt die weg, dan vallen
  // we terug op de CampaignKnowledgeAsset-productIds (legacy/blueprint-pad). Zo
  // krijgt de generator de échte productdata i.p.v. niets (vandaag: 0/53 campagnes
  // hebben een Product-knowledge-asset).
  const settingsInputs = (settings.contentTypeInputs ?? {}) as Record<string, unknown>;
  const selectedProductId =
    typeof settingsInputs.productId === 'string' && settingsInputs.productId.trim().length > 0
      ? settingsInputs.productId.trim()
      : null;

  let productIds: string[] = [];
  if (selectedProductId) {
    productIds = [selectedProductId];
  } else {
    const productAssets = await prisma.campaignKnowledgeAsset.findMany({
      where: { campaignId: deliverable.campaignId, assetType: 'Product', productId: { not: null } },
      select: { productId: true },
    });
    productIds = productAssets.map((a) => a.productId).filter((id): id is string => id !== null);
  }

  const products: ProductContext[] = [];
  if (productIds.length > 0) {
    const productRecords = await prisma.product.findMany({
      // workspaceId in de where filtert een cross-tenant/stale productId
      // (settings kan een verwijderd of fremd product noemen) defensief weg.
      where: { id: { in: productIds }, workspaceId },
      select: {
        id: true, name: true, description: true, category: true,
        pricingModel: true, pricingDetails: true, features: true,
        benefits: true, useCases: true,
        images: {
          select: { url: true, category: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    for (const p of productRecords) {
      products.push({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingModel: p.pricingModel,
        pricingDetails: p.pricingDetails,
        features: p.features,
        benefits: p.benefits,
        useCases: p.useCases,
        images: p.images.map((img) => ({
          url: img.url,
          category: String(img.category),
          altText: img.altText,
          sortOrder: img.sortOrder,
        })),
      });
    }
  }

  // Content-type-specific inputs from deliverable settings
  const contentTypeInputs = (settings.contentTypeInputs ?? undefined) as
    Record<string, string | string[] | number | boolean> | undefined;

  // Visual Brief — strategic visual direction (source + style chips). Falls
  // back to migrating legacy contentTypeInputs.visualStyle / visualDirection
  // / contentStyle into styleDirectionFreeText so existing deliverables
  // don't lose their visual hint after the schema migration.
  const visualBrief = parseVisualBrief(settings.visualBrief, contentTypeInputs);

  // User-selected knowledge-context items (Step 1 picker). Persisted on
  // settings.additionalContextItems so the selection is durable; defensively
  // parsed (only well-formed entries survive a malformed/legacy blob).
  type AdditionalContextItem = {
    sourceType: string;
    sourceId: string;
    title: string;
    note?: string;
    priority?: 'primary' | 'reference';
  };
  let additionalContextItems: AdditionalContextItem[] | undefined = Array.isArray(
    settings.additionalContextItems,
  )
    ? (settings.additionalContextItems as unknown[]).flatMap((raw): AdditionalContextItem[] => {
        if (!raw || typeof raw !== 'object') return [];
        const o = raw as Record<string, unknown>;
        if (typeof o.sourceType === 'string' && typeof o.sourceId === 'string') {
          // Carry user guidance (note) + priority through hydration — else the
          // selection survives reload but loses its weighting/annotation.
          const note = typeof o.note === 'string' && o.note.trim().length > 0 ? o.note : undefined;
          const priority: 'primary' | 'reference' | undefined =
            o.priority === 'primary' || o.priority === 'reference' ? o.priority : undefined;
          return [{
            sourceType: o.sourceType,
            sourceId: o.sourceId,
            title: typeof o.title === 'string' ? o.title : 'Untitled',
            ...(note ? { note } : {}),
            ...(priority ? { priority } : {}),
          }];
        }
        return [];
      })
    : undefined;

  // Wens 1 — campagne-pre-selectie: seed de picker met de campagne-geselecteerde
  // kennis (isAutoSelected) wanneer de gebruiker nog NOOIT zelf koos. `undefined`
  // = key afwezig → seed; een bewust geleegde selectie (`[]`) wordt gerespecteerd
  // en NIET opnieuw geseed. De store-hydration-guard (additionalContextItemsModified)
  // zorgt dat de seed latere user-edits binnen een sessie niet clobbert.
  if (additionalContextItems === undefined) {
    const autoSelected = await prisma.campaignKnowledgeAsset.findMany({
      where: {
        campaignId: deliverable.campaignId,
        isAutoSelected: true,
        sourceType: { not: null },
        sourceId: { not: null },
      },
      select: { sourceType: true, sourceId: true },
    });
    // Source types that are ALREADY injected as first-class context elsewhere in
    // the stack must NOT be seeded here, or the same record lands twice in the
    // prompt under conflicting framings: brand_asset = always-on brand context;
    // persona → stack.personas (Layer 5 fallback reads personaId); product →
    // stack.products (Layer 7 fallback reads productId). Only the types with no
    // dedicated slot (knowledge_resource / competitor / detected_trend /
    // business_strategy) are genuinely "additional".
    // PERF: pre-filter to seedable candidates BEFORE the expensive live-data
    // sweep, so the common case (campaign with only persona/product/brand_asset
    // auto-selected) — and hot/public callers of assembleCanvasContext like the
    // /p/[slug] render and image-gen routes — pay ONE cheap query instead of an
    // 8-model getAvailableContextItems fan-out for a seed that ends up empty.
    const STACK_INJECTED_TYPES = new Set(['brand_asset', 'persona', 'product']);
    const candidates = autoSelected.filter(
      (r): r is { sourceType: string; sourceId: string } =>
        !!r.sourceType && !!r.sourceId && !STACK_INJECTED_TYPES.has(r.sourceType),
    );
    if (candidates.length > 0) {
      // Resolve real titles + reconcile against live data. getAvailableContextItems
      // is workspace-scoped, so deleted / cross-workspace rows simply don't
      // resolve and are dropped (no zombie pre-selections).
      const liveGroups = await getAvailableContextItems(workspaceId);
      const titleByKey = new Map<string, string>();
      for (const g of liveGroups) {
        for (const it of g.items) titleByKey.set(`${it.sourceType}:${it.sourceId}`, it.title);
      }
      const seeded: AdditionalContextItem[] = [];
      const seen = new Set<string>();
      for (const { sourceType, sourceId } of candidates) {
        const key = `${sourceType}:${sourceId}`;
        if (seen.has(key)) continue;
        const title = titleByKey.get(key);
        if (!title) continue;
        seen.add(key);
        // Campaign-selected knowledge is treated as authoritative source material.
        seeded.push({ sourceType, sourceId, title, priority: 'primary' });
      }
      if (seeded.length > 0) additionalContextItems = seeded;
    }
  }

  // Puck data-tree for web-page builder (per ADR 2026-05-22-landing-page-builder-architectuur).
  // Null when never edited — Canvas store seeds via variantToPuckData() on first mount.
  const puckData = settings.puckData ?? null;

  // Structural brand-tokens for the Puck builder — read once, pure-function.
  // BrandStyleguide is workspace-unique (@@unique([workspaceId])); we eagerly
  // load colors + fonts so extractBrandTokensFromStyleguide can pick the right
  // record per category/role without N+1 fetches.
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: {
      primaryFontName: true,
      layoutStyle: true,
      layoutStyleInferred: true,
      archetype: true,
      // R5-gate (audit 2026-06-10-lp-feature-image-diversity): photographyStyle
      // voedt image-gen prompts en mag alleen meedoen na user-review — zelfde
      // semantiek als de imagery-gate in brand-context.ts (published-blok →
      // imagerySavedForAi). Rendering-tokens blijven bewust ongegate.
      published: true,
      imagerySavedForAi: true,
      // Verbeterplan Fase B — rendering-profiles (Json velden voor v4 tokens)
      buttonProfile: true,
      typographyProfile: true,
      spacingProfile: true,
      spacingScale: true,
      elevationProfile: true,
      radiusProfile: true,
      motionProfile: true,
      photographyStyle: true,
      visualLanguage: true,
      colors: { select: {
        hex: true, category: true, sortOrder: true,
        tags: true, contrastWhite: true, contrastBlack: true, confidence: true,
      } },
      // E-3 — availability + upload-velden zodat de canvas-loader Adobe/uploaded
      // fonts kan laden (niet alleen Google).
      fonts: { select: { name: true, role: true, fontFamily: true, sortOrder: true, availability: true, fileUrl: true, fileType: true } },
      // E-3 — workspace-eigen Adobe Typekit kit-id (domain-geconfigureerd).
      workspace: { select: { adobeFontsKitId: true } },
      // P2 — brand-eigen beelden voor de beeld-producer.
      brandImages: true,
      // W4-fix (logo in de nav): logo-assets voor de AnchorNav/BrandNav-brandslot.
      logos: { select: { variant: true, fileUrl: true, sortOrder: true } },
      components: {
        select: {
          type: true, label: true, extractedStyles: true, confidence: true,
        },
        // Deterministische volgorde voor mapStyleguideComponents highest-conf
        // pick: confidence DESC, dan sortOrder ASC als tiebreaker.
        orderBy: [{ confidence: 'desc' }, { sortOrder: 'asc' }],
      },
    },
  });
  // R5-gate: een OBSERVED scrape-beschrijving mag niet prescriptief alle
  // gegenereerde beelden sturen zolang de imagery niet gereviewd is. Bij
  // gate-dicht vallen de photography-tokens op DEFAULT terug; prompt-builders
  // gebruiken dan hun archetype-fallback (pickHeroImagePromptFragment).
  // W4-fix — nav-logo: kies een horizontaal-vriendelijke variant voor het
  // brand-slot van de AnchorNav/BrandNav (LOCKUP/PRIMARY/WORDMARK lezen breed;
  // ICON als laatste). Leeg → de nav valt terug op de merknaam als tekst.
  const brandNavLogoUrl = (() => {
    const logos = styleguide?.logos ?? [];
    if (logos.length === 0) return null;
    const pref = ['LOCKUP', 'PRIMARY', 'WORDMARK', 'DARK', 'ICON', 'LIGHT'];
    for (const variant of pref) {
      const pick = logos
        .filter((l) => l.variant === variant && typeof l.fileUrl === 'string' && l.fileUrl.length > 0)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (pick) return pick.fileUrl;
    }
    const any = [...logos].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    return any?.fileUrl ?? null;
  })();

  const imageryGateOpen = Boolean(styleguide?.published && styleguide?.imagerySavedForAi);
  const gatedStyleguide = styleguide && !imageryGateOpen
    ? { ...styleguide, photographyStyle: null }
    : styleguide;
  const { tokens: brandTokens, provenance: brandProvenance } =
    extractBrandTokensWithProvenance(gatedStyleguide, {
      adobeFontsKitId: styleguide?.workspace?.adobeFontsKitId ?? null,
    });

  return {
    brand, concept, journeyPhase, medium,
    deliverableTypeId: deliverable.contentType ?? null,
    personas, brief, products, contentTypeInputs, visualBrief, additionalContextItems, puckData, brandTokens, brandProvenance,
    brandImages: parseBrandImages(styleguide?.brandImages),
    brandNavLogoUrl,
    brandStyleguideMeta: {
      layoutStyleInferred: styleguide?.layoutStyleInferred ?? false,
    },
  };
}

/**
 * Parse the stored Json `settings.visualBrief` into a typed VisualBrief.
 * Returns null when nothing has been set AND there is no legacy data to
 * migrate. Legacy migration: pre-VisualBrief deliverables stored visual
 * hints in `contentTypeInputs.visualStyle / visualDirection / contentStyle`
 * — we surface those as styleDirectionFreeText so the orchestrator still
 * has something to inject.
 */
function parseVisualBrief(
  raw: unknown,
  legacyInputs: Record<string, string | string[] | number | boolean> | undefined,
): VisualBrief | null {
  // New schema — stored object shape
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const validSources: VisualBriefSource[] = [
      'generate', 'library', 'upload', 'url', 'stock', 'smart-search', 'compose', 'trained-style', 'photography-request', 'none',
    ];
    const rawSource = obj.source as string | undefined;
    const source: VisualBriefSource =
      rawSource && validSources.includes(rawSource as VisualBriefSource)
        ? (rawSource as VisualBriefSource)
        : 'generate';
    const styleDirection = (obj.styleDirection ?? null) as VisualStyleDirection | null;
    const styleDirectionFreeText = (obj.styleDirectionFreeText ?? null) as string | null;
    const briefingText = (obj.briefingText ?? null) as string | null;
    const generate = obj.generate as VisualBrief['generate'];
    const library = obj.library as VisualBrief['library'];
    const compose = obj.compose as VisualBrief['compose'];
    const trained = obj.trained as VisualBrief['trained'];
    return { source, styleDirection, styleDirectionFreeText, briefingText, generate, library, compose, trained };
  }
  // Legacy migration — synthesize a minimal VisualBrief from old keys
  const legacyVisualStyle = typeof legacyInputs?.visualStyle === 'string' ? legacyInputs.visualStyle : null;
  const legacyVisualDirection = typeof legacyInputs?.visualDirection === 'string' ? legacyInputs.visualDirection : null;
  const legacyContentStyle = typeof legacyInputs?.contentStyle === 'string' ? legacyInputs.contentStyle : null;
  const freeText = legacyVisualDirection ?? null;
  const styleDirection = mapLegacyStyleToChip(legacyVisualStyle ?? legacyContentStyle);
  if (!freeText && !styleDirection) return null;
  return {
    source: 'generate',
    styleDirection,
    styleDirectionFreeText: freeText,
  };
}

/**
 * Best-effort mapping from the old free-form `visualStyle` / `contentStyle`
 * values to the canonical chip vocabulary. Unknown values fall through to
 * null and the user can re-pick a chip.
 */
function mapLegacyStyleToChip(value: string | null): VisualStyleDirection | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  const map: Record<string, VisualStyleDirection> = {
    photo: 'lifestyle',
    illustration: 'illustration',
    'text-only': 'quote-text',
    infographic: 'infographic',
    'product shot': 'product-shot',
    'product-shot': 'product-shot',
    lifestyle: 'lifestyle',
    'quote / text': 'quote-text',
    'behind the scenes': 'behind-the-scenes',
    'user-generated': 'ugc',
    'product focused': 'product-shot',
    testimonial: 'lifestyle',
    'data / statistic': 'data-driven',
    'data-driven': 'data-driven',
    'photo-centric': 'lifestyle',
    'clean & minimal': 'quote-text',
    'bold & colorful': 'lifestyle',
  };
  return map[v] ?? null;
}
