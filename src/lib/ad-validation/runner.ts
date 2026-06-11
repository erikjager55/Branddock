// =============================================================
// Ad Quality Validation — runner orchestrator
//
// Per spec sectie 5.2.1: sequential L1 → L2 → aggregate → persist.
// L1-errors zijn praktisch onmogelijk (pure functions); L2 kan
// netwerk-issues hebben. Failure-policy: L1-only-fallback — als L2
// faalt persisteren we de L1-score met `l2Results: { error,
// fallback: true }` en de UI toont de badge met aantekening
// "AI-judge unavailable, mechanical checks only".
//
// Idempotency: contentHash unique-key voorkomt dubbele rows voor
// identieke input (groups + primaryKeyword + platform + contentType
// + version-constants).
// =============================================================

import type { AdQualityScore } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';
import { aggregate } from './aggregation';
import { contentHash } from './content-hash';
import { getValidator } from './registry';
import { setupAdValidators } from './setup';
import type {
  ComponentTemplateItem,
  GroupContents,
  L2JudgeResult,
  RuleResult,
  ValidatorContext,
} from './types';
import { runAdJudge } from './judge/dispatcher';

export class AdQualityError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AdQualityError';
  }
}

/**
 * Load the text-component contents for one variant of a deliverable,
 * keyed by component-group name (`variantGroup`, falling back to
 * `componentType`) — the same names the L1-rules and L2-judges read
 * (e.g. `headline`, `description-1`, `body`).
 *
 * Mirrors the proven variant-component query in canvas-orchestrator:
 * variants are selected via `variantIndex` (NOT `groupIndex`, which is
 * the position within sequence/slide groups) and non-text components
 * are excluded by `componentType` (there is no 'TEXT' componentType —
 * the column holds per-field type names).
 */
async function loadVariantGroups(
  deliverableId: string,
  variantIndex: number,
): Promise<GroupContents> {
  const components = await prisma.deliverableComponent.findMany({
    where: {
      deliverableId,
      variantIndex,
      componentType: { notIn: ['image', 'video', 'voiceover'] },
      generatedContent: { not: null },
    },
    select: {
      componentType: true,
      variantGroup: true,
      generatedContent: true,
    },
  });

  const groups: GroupContents = new Map();
  for (const c of components) {
    if (c.generatedContent && c.generatedContent.trim().length > 0) {
      groups.set(c.variantGroup ?? c.componentType, c.generatedContent);
    }
  }
  return groups;
}

export async function runAdQualityValidation(
  deliverableId: string,
  variantIndex: number,
): Promise<AdQualityScore> {
  setupAdValidators(); // idempotent

  // Resolve workspace via deliverable's campaign relation
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: {
      id: true,
      contentType: true,
      campaign: { select: { workspaceId: true } },
    },
  });
  if (!deliverable) {
    throw new AdQualityError(`Deliverable ${deliverableId} not found`, 404);
  }
  const workspaceId = deliverable.campaign.workspaceId;
  const contentType = deliverable.contentType;

  // Validator-registry lookup — unknown contentType is fail-loud
  const validator = getValidator(contentType);
  if (!validator) {
    throw new AdQualityError(
      `No ad-quality validator registered for contentType "${contentType}"`,
      400,
    );
  }

  // Layer-stack: brand context + medium enrichment (componentTemplate
  // + platform/format). Cached 5-min for brand.
  const stack = await assembleCanvasContext(deliverableId, workspaceId);

  // Cache self-healing note: contentHash serializes ctx.groups, so any
  // historic score rows persisted while this query was broken (empty
  // groups → judges scored "(empty)") hash differently from real
  // content. The idempotency-lookup below misses them, a fresh score
  // is created, and the GET route's newest-generatedAt dedup shadows
  // the orphaned empty-score rows.
  const groups = await loadVariantGroups(deliverableId, variantIndex);
  if (groups.size === 0) {
    throw new AdQualityError(
      `Deliverable ${deliverableId} variant ${variantIndex} has no generated text components to score`,
      422,
    );
  }

  // Image is een aparte componentType — count whether any selected
  // hero-image exists for this deliverable. The judges' image-direction
  // input lives on that row too (imagePromptUsed/visualBrief), NOT in
  // generatedContent — groups.get('image') was structurally empty
  // (audit 2026-06-11 follow-up of C7).
  const heroImage = await prisma.deliverableComponent.findFirst({
    where: {
      deliverableId,
      componentType: 'image',
      imageUrl: { not: null },
    },
    select: { id: true, imagePromptUsed: true },
  });
  const hasImage = !!heroImage;
  // visualBrief is deliberately NOT a fallback: it holds raw JSON, which
  // would inject brace-noise into the judge prompts.
  const imageDirection = heroImage?.imagePromptUsed?.trim() || null;

  // Primary keyword from contentTypeInputs (search-ad only)
  const primaryKeyword =
    typeof stack.contentTypeInputs?.seoKeyword === 'string'
      ? (stack.contentTypeInputs.seoKeyword as string)
      : undefined;

  const componentTemplate: ComponentTemplateItem[] = Array.isArray(
    stack.medium?.componentTemplate,
  )
    ? (stack.medium.componentTemplate as ComponentTemplateItem[])
    : [];

  const ctx: ValidatorContext = {
    groups,
    platform: stack.medium?.platform ?? 'unknown',
    contentType,
    primaryKeyword,
    componentTemplate,
    brandContext: stack.brand,
    hasImage,
    imageDirection,
  };

  // Idempotency check — same hash means we've scored this exact input
  const hash = contentHash(ctx);
  const existing = await prisma.adQualityScore.findUnique({
    where: {
      deliverableId_variantIndex_contentHash: {
        deliverableId,
        variantIndex,
        contentHash: hash,
      },
    },
  });
  if (existing) return existing;

  // ── L1: pure functions, always succeed ────────────────────
  const l1Results: RuleResult[] = validator.rules.flatMap((rule) => rule(ctx));

  // ── L2: LLM call with fail-soft fallback ──────────────────
  const l2Results: L2JudgeResult = await runAdJudge(validator.judge, ctx);

  // ── Aggregate ─────────────────────────────────────────────
  const { overallScore, ratingLabel } = aggregate(l1Results, l2Results, validator.weights);

  // ── Persist ───────────────────────────────────────────────
  const row = await prisma.adQualityScore.create({
    data: {
      deliverableId,
      variantIndex,
      platform: ctx.platform,
      contentType,
      overallScore,
      ratingLabel,
      l1Results: JSON.parse(JSON.stringify(l1Results)),
      l2Results: JSON.parse(JSON.stringify(l2Results)),
      contentHash: hash,
    },
  });
  return row;
}
