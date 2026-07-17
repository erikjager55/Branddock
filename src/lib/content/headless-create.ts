// =============================================================
// Headless content-service — create + generate een content-item als één
// server-side aanroep, zonder UI (Postiz-verbeterplan P3.0a).
//
// Eén functie bedient drie afnemers: de Brand Assistant (quick-create,
// P3.0b), de agents (confirm-route hergebruikt de drain hieronder) en de
// toekomstige publieke API/MCP (P3.2). Tweede-deur-principe: alles loopt
// door dezelfde domein-modellen en dezelfde orchestrator als de UI, dus
// het resultaat is direct zichtbaar in de content-library.
//
// contextSelection is de API-vorm van de kennis-aan/uit-toggles:
//   personaIds        → settings.targetPersonas
//   productIds[0]     → settings.contentTypeInputs.productId (UI-pariteit:
//                       de Canvas kent één product-select); extra producten
//                       gaan als additionalContextItems mee
//   competitorIds     → settings.additionalContextItems (sourceType competitor)
//   knowledgeResourceIds → settings.additionalContextItems (knowledge_resource)
// =============================================================

import { prisma } from '@/lib/prisma';
import { orchestrateContentGeneration } from '@/lib/ai/canvas-orchestrator';
import { serializeContextForPrompt } from '@/lib/ai/context/fetcher';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { dispatchWebhookEvent } from '@/lib/api/public/webhooks';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

const DEFAULT_CAMPAIGN_SLUG = 'quick-content';
const DEFAULT_CAMPAIGN_TITLE = 'Quick Content';

/** Zelfde waardetype als OrchestrationOptions.contentTypeInputs — bewust geen `unknown`. */
export type ContentTypeInputs = Record<string, string | number | boolean | string[]>;

export interface HeadlessBrief {
  objective?: string;
  keyMessage?: string;
  toneDirection?: string;
  callToAction?: string;
}

export interface ContextSelection {
  personaIds?: string[];
  productIds?: string[];
  competitorIds?: string[];
  knowledgeResourceIds?: string[];
}

export interface CreateAndGenerateInput {
  workspaceId: string;
  /** Bestaande campagne; zonder wordt de default "Quick Content"-campagne (find-or-create) gebruikt. */
  campaignId?: string;
  /** Content-type-slug uit de deliverable-types-catalogus (bijv. "linkedin-post"). */
  contentType: string;
  title?: string;
  brief: HeadlessBrief;
  contentTypeInputs?: ContentTypeInputs;
  contextSelection?: ContextSelection;
  /** Herbestemmen: bron-deliverable (zelfde workspace) — zet de derived-from-relatie. */
  sourceDeliverableId?: string;
  /** false = alleen aanmaken (Canvas genereert later); default true. */
  generate?: boolean;
}

export type HeadlessErrorCode =
  | 'BRIEF_INCOMPLETE'
  | 'CONTENT_TYPE_UNKNOWN'
  | 'CAMPAIGN_NOT_FOUND'
  | 'CAMPAIGN_LOCKED'
  | 'CONTEXT_IDS_INVALID'
  | 'SOURCE_NOT_FOUND';

export type CreateAndGenerateResult =
  | {
      ok: true;
      deliverableId: string;
      campaignId: string;
      title: string;
      /** null wanneer generate=false of de score niet uit de events kwam. */
      fidelityScore: number | null;
      /**
       * De gegenereerde tekst: de geselecteerde — of eerste — pure
       * tekst-component (geen image/video) na de drain. null bij
       * generate=false, een generatie-fout of een type zonder tekst-component.
       */
      contentText: string | null;
      /** Fail-soft: het item bestaat ook als de generatie faalde — via de Canvas alsnog te genereren. */
      generationError: string | null;
    }
  | { ok: false; code: HeadlessErrorCode; error: string };

class HeadlessError extends Error {
  constructor(
    public readonly code: HeadlessErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface ContextItemRef {
  sourceType: string;
  sourceId: string;
  title: string;
}

interface ResolvedContext {
  targetPersonas: string[];
  productId: string | null;
  additionalContextItems: ContextItemRef[];
}

async function ensureCampaign(workspaceId: string, campaignId?: string): Promise<string> {
  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
      select: { id: true, title: true, isLocked: true },
    });
    if (!campaign) throw new HeadlessError('CAMPAIGN_NOT_FOUND', 'Campaign not found in this workspace');
    if (campaign.isLocked) {
      throw new HeadlessError('CAMPAIGN_LOCKED', `Campaign "${campaign.title}" is locked. Unlock it first.`);
    }
    return campaign.id;
  }
  const fallback = await prisma.campaign.upsert({
    where: { workspaceId_slug: { workspaceId, slug: DEFAULT_CAMPAIGN_SLUG } },
    update: {},
    create: {
      title: DEFAULT_CAMPAIGN_TITLE,
      slug: DEFAULT_CAMPAIGN_SLUG,
      type: 'CONTENT',
      status: 'ACTIVE',
      workspaceId,
    },
    select: { id: true, isLocked: true },
  });
  if (fallback.isLocked) {
    throw new HeadlessError('CAMPAIGN_LOCKED', `Default campaign "${DEFAULT_CAMPAIGN_TITLE}" is locked. Unlock it first.`);
  }
  return fallback.id;
}

/** Valideert alle contextSelection-ID's workspace-gescoped en resolvet titels voor de context-items. */
async function resolveContextSelection(
  workspaceId: string,
  selection: ContextSelection | undefined,
): Promise<ResolvedContext> {
  const personaIds = selection?.personaIds ?? [];
  const productIds = selection?.productIds ?? [];
  const competitorIds = selection?.competitorIds ?? [];
  const knowledgeResourceIds = selection?.knowledgeResourceIds ?? [];

  const [personas, products, competitors, knowledge] = await Promise.all([
    personaIds.length
      ? prisma.persona.findMany({ where: { id: { in: personaIds }, workspaceId }, select: { id: true } })
      : [],
    productIds.length
      ? prisma.product.findMany({ where: { id: { in: productIds }, workspaceId }, select: { id: true, name: true } })
      : [],
    competitorIds.length
      ? prisma.competitor.findMany({ where: { id: { in: competitorIds }, workspaceId }, select: { id: true, name: true } })
      : [],
    knowledgeResourceIds.length
      ? prisma.knowledgeResource.findMany({
          where: { id: { in: knowledgeResourceIds }, workspaceId },
          select: { id: true, title: true },
        })
      : [],
  ]);

  const missing: string[] = [
    ...personaIds.filter((id) => !personas.some((p) => p.id === id)),
    ...productIds.filter((id) => !products.some((p) => p.id === id)),
    ...competitorIds.filter((id) => !competitors.some((c) => c.id === id)),
    ...knowledgeResourceIds.filter((id) => !knowledge.some((k) => k.id === id)),
  ];
  if (missing.length > 0) {
    throw new HeadlessError('CONTEXT_IDS_INVALID', `Unknown context ids for this workspace: ${missing.join(', ')}`);
  }

  const additionalContextItems: ContextItemRef[] = [
    // Eerste product stuurt de Canvas-product-select; de rest gaat als context-item mee.
    ...products.slice(1).map((p) => ({ sourceType: 'product', sourceId: p.id, title: p.name })),
    ...competitors.map((c) => ({ sourceType: 'competitor', sourceId: c.id, title: c.name })),
    ...knowledge.map((k) => ({ sourceType: 'knowledge_resource', sourceId: k.id, title: k.title })),
  ];

  return {
    targetPersonas: personaIds,
    productId: products[0]?.id ?? null,
    additionalContextItems,
  };
}

/**
 * Draait de canvas-orchestrator non-streaming voor een bestaand deliverable en
 * vangt de F-VAL-score uit de events. Fail-soft: een generatie-fout laat het
 * deliverable intact (via de Canvas alsnog te genereren). Gedeeld met de
 * agents-confirm-route — er is bewust maar één drain-implementatie.
 */
export async function drainDeliverableGeneration(
  deliverableId: string,
  workspaceId: string,
  options?: { additionalContextText?: string; contentTypeInputs?: ContentTypeInputs },
): Promise<{ fidelityScore: number | null; error: string | null }> {
  let fidelityScore: number | null = null;
  let generationError: string | null = null;
  try {
    const generator = orchestrateContentGeneration(deliverableId, workspaceId, options);
    for await (const event of generator) {
      if (event.event === 'fidelity_score_complete') {
        const data = (event.data ?? {}) as Record<string, unknown>;
        if (typeof data.compositeScore === 'number') fidelityScore = data.compositeScore;
      } else if (event.event === 'error') {
        const data = (event.data ?? {}) as Record<string, unknown>;
        generationError = typeof data.message === 'string' ? data.message : 'Content generation failed';
        break;
      }
    }
    if (!generationError) {
      await prisma.deliverable.update({ where: { id: deliverableId }, data: { status: 'IN_PROGRESS' } });
    }
  } catch (err) {
    generationError = err instanceof Error ? err.message : 'Content generation failed';
    console.warn('[headless-create] deliverable generation failed', { deliverableId, message: generationError });
  }
  return { fidelityScore, error: generationError };
}

/**
 * Geselecteerde — of eerste — pure tekst-component van een deliverable
 * (image-/video-componenten dragen generatedContent als prompt en tellen
 * bewust niet mee). Gedeeld door de generate-response en get_deliverable_content.
 */
async function fetchSelectedContentText(deliverableId: string): Promise<string | null> {
  const component = await prisma.deliverableComponent.findFirst({
    where: { deliverableId, generatedContent: { not: null }, imageUrl: null, videoUrl: null },
    orderBy: [{ isSelected: 'desc' }, { order: 'asc' }],
    select: { generatedContent: true },
  });
  return component?.generatedContent ?? null;
}

/**
 * Maakt een content-item aan en genereert de content in één aanroep — de
 * headless variant van Quick Content + Canvas-Generate. Gestructureerde
 * fouten i.p.v. throws zodat elke afnemer (chat-tool, API, agent) ze kan
 * tonen; pre-gates gespiegeld aan de orchestrator (brief + merknaam).
 */
export async function createAndGenerateDeliverable(
  input: CreateAndGenerateInput,
): Promise<CreateAndGenerateResult> {
  try {
    // Brief-gate spiegelt de orchestrator-pre-gate en geldt dus alleen bij
    // genereren; een create-only (Canvas vult later) mag briefloos — UI-pariteit.
    if (input.generate !== false && !input.brief.objective?.trim() && !input.brief.keyMessage?.trim()) {
      throw new HeadlessError('BRIEF_INCOMPLETE', 'Brief needs at least an objective or a key message');
    }
    if (!getDeliverableTypeById(input.contentType)) {
      throw new HeadlessError('CONTENT_TYPE_UNKNOWN', `Unknown content type "${input.contentType}"`);
    }

    const campaignId = await ensureCampaign(input.workspaceId, input.campaignId);
    const resolved = await resolveContextSelection(input.workspaceId, input.contextSelection);

    if (input.sourceDeliverableId) {
      const source = await prisma.deliverable.findFirst({
        where: { id: input.sourceDeliverableId, campaign: { workspaceId: input.workspaceId } },
        select: { id: true },
      });
      if (!source) throw new HeadlessError('SOURCE_NOT_FOUND', 'Source deliverable not found in this workspace');
    }

    const brief: Record<string, string> = {};
    if (input.brief.objective?.trim()) brief.objective = input.brief.objective.trim();
    if (input.brief.keyMessage?.trim()) brief.keyMessage = input.brief.keyMessage.trim();
    if (input.brief.toneDirection?.trim()) brief.toneDirection = input.brief.toneDirection.trim();
    if (input.brief.callToAction?.trim()) brief.callToAction = input.brief.callToAction.trim();

    const contentTypeInputs: ContentTypeInputs = {
      ...(input.contentTypeInputs ?? {}),
      ...(resolved.productId ? { productId: resolved.productId } : {}),
    };

    const settings: Record<string, unknown> = { brief };
    if (resolved.targetPersonas.length > 0) settings.targetPersonas = resolved.targetPersonas;
    if (Object.keys(contentTypeInputs).length > 0) settings.contentTypeInputs = contentTypeInputs;
    if (resolved.additionalContextItems.length > 0) {
      settings.additionalContextItems = resolved.additionalContextItems;
    }

    const title = (input.title ?? input.contentType).trim() || input.contentType;
    const deliverable = await prisma.deliverable.create({
      data: {
        title,
        contentType: input.contentType,
        campaignId,
        status: 'NOT_STARTED',
        progress: 0,
        approvalStatus: 'DRAFT',
        ...(input.sourceDeliverableId ? { derivedFromId: input.sourceDeliverableId } : {}),
        settings,
      },
      select: { id: true, title: true },
    });

    invalidateCache(cacheKeys.prefixes.campaigns(input.workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(input.workspaceId));

    if (input.generate === false) {
      return {
        ok: true,
        deliverableId: deliverable.id,
        campaignId,
        title: deliverable.title,
        fidelityScore: null,
        contentText: null,
        generationError: null,
      };
    }

    const additionalContextText =
      resolved.additionalContextItems.length > 0
        ? await serializeContextForPrompt(resolved.additionalContextItems, input.workspaceId)
        : undefined;
    const { fidelityScore, error } = await drainDeliverableGeneration(deliverable.id, input.workspaceId, {
      ...(additionalContextText ? { additionalContextText } : {}),
      ...(Object.keys(contentTypeInputs).length > 0 ? { contentTypeInputs } : {}),
    });

    // P3.3 outbound webhook — alleen bij een geslaagde generatie, fire-and-
    // forget (dispatcher is fail-soft) en metadata-only: ids/type/score, geen
    // content-tekst. De ontvanger haalt de inhoud op via de publieke API.
    if (error === null) {
      void dispatchWebhookEvent(input.workspaceId, 'deliverable.generated', {
        deliverableId: deliverable.id,
        campaignId,
        contentType: input.contentType,
        fidelityScore,
      });
    }

    return {
      ok: true,
      deliverableId: deliverable.id,
      campaignId,
      title: deliverable.title,
      fidelityScore,
      contentText: error === null ? await fetchSelectedContentText(deliverable.id) : null,
      generationError: error,
    };
  } catch (err) {
    if (err instanceof HeadlessError) {
      return { ok: false, code: err.code, error: err.message };
    }
    throw err;
  }
}
