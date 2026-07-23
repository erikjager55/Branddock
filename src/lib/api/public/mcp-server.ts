// =============================================================
// Publieke Brand-API — MCP-server (Fase B + "merken zijn taal"-batch,
// ADR 2026-07-17-public-brand-api).
//
// Bouwt per request een verse McpServer met de 18 publieke brand-tools,
// gebonden aan de auth-context (stateless serverless-patroon — zie
// src/app/api/mcp/route.ts). Tweede-deur-principe: elke tool loopt door
// exact dezelfde services als de UI en de REST-routes (/api/v1/*).
//
// "Merken zijn taal": elke tool accepteert een optioneel `brand`-param
// (workspace-id of merknaam) — resolutie + membership-validatie in
// brand-resolver.ts. OAuth-callers met viewer-rol zijn read-only
// (write-tools geven een nette error); het API-key-pad is machine-toegang
// en blijft merk-vergrendeld. Elke tool-aanroep logt metadata-only naar
// ApiCallLog onder het efféctieve merk (fail-soft — logging laat een
// geslaagde aanroep nooit falen). Tool-annotations (readOnlyHint e.d.)
// volgen de Anthropic-Connectors-Directory-vereisten; er zit bewust niets
// destructiefs in de set.
// =============================================================

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { runFidelityForExternalContent } from '@/lib/brand-fidelity/external-content-runner';
import { createAndGenerateDeliverable } from '@/lib/content/headless-create';
import { rewriteOnBrand } from '@/lib/content/rewrite-on-brand';
import { startCampaignStrategyGeneration, getStrategyStatus } from '@/lib/campaigns/headless-strategy';
import { startSeoGeneration, getSeoStatus } from '@/lib/content/headless-seo';
import { generateWebPage } from '@/lib/content/headless-webpage';
import { generateVideoClip } from '@/lib/content/headless-video';
import { getDeliverableContent } from '@/lib/content/deliverable-content';
import { generateBrandImage, DEFAULT_IMAGE_PROVIDER } from '@/lib/content/headless-image';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { enforceCreditsForAction } from '@/lib/stripe/enforcement';
import { logApiCall, type ApiCallMeta } from '@/lib/api/public/usage';
import {
  listBrandsForContext,
  resolveBrandParam,
  requireWriteAccess,
} from '@/lib/api/public/brand-resolver';
import { importBrandData, type BrandImportPayload } from '@/lib/api/public/brand-import';

/**
 * Auth-context van de aanroepende request: default-merk + via welk auth-pad
 * ('api_key' = bd_live-key, 'oauth' = connector-Bearer-token via de Better
 * Auth mcp-plugin). Het OAuth-pad draagt de token-user mee (membership- en
 * rol-checks) en een eventueel consent-slot; authVia stroomt 1-op-1 door
 * naar de usage-log. Structureel compatibel met BrandAccessContext.
 */
export interface PublicMcpContext {
  workspaceId: string;
  authVia: ApiCallMeta['authVia'];
  /** OAuth-pad: de token-user; key-pad: undefined (machine-toegang). */
  userId?: string;
  /** OAuth-pad: consent-vergrendeling op één merk (undefined = geen slot). */
  lockedWorkspaceId?: string;
}

/** Discovery-reads zijn bewust gecapt — agents hebben een shortlist nodig, geen dump. */
const MAX_ROWS = 50;
/** Vlakke 'short'-afboeking per gegenereerd item — zelfde tarief als /api/v1/generate. */
const GENERATE_CREDITS = 5;
/** 'image'-afboeking per beeld — zelfde tarief als de Media Library (credit-costs.ts). */
const IMAGE_CREDITS = 2;

/** Connectors-Directory-annotations: read/score/status/list-tools. */
const READ_TOOL: ToolAnnotations = { readOnlyHint: true };
/** Connectors-Directory-annotations: generatie-tools — muteren wel, vernietigen niets. */
const WRITE_TOOL: ToolAnnotations = { readOnlyHint: false, destructiveHint: false };

// ─── Result-helpers ──────────────────────────────────────────

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

interface ToolRun {
  result: CallToolResult;
  credits?: number;
}

/** Optioneel merk-param op elke tool — resolutie/validatie in brand-resolver.ts. */
const brandParam = {
  brand: z
    .string()
    .optional()
    .describe(
      'Optioneel: ander merk dan het standaard-merk — workspace-id of exacte merknaam ' +
        '(case-insensitive; zie list_brands). OAuth: alleen merken waar je lid van bent; ' +
        'API-keys zijn merk-vergrendeld en accepteren alleen het eigen merk.',
    ),
};

/**
 * Draait een tool-handler met merk-resolutie, rol-gate (write-tools),
 * latency-meting en metadata-only usage-log onder het effectieve merk.
 * Throws worden een nette tool-error (isError) zodat de MCP-client een
 * leesbare fout krijgt i.p.v. een protocol-level crash.
 */
async function runTool(
  ctx: PublicMcpContext,
  tool: string,
  access: 'read' | 'write',
  brand: string | undefined,
  fn: (workspaceId: string) => Promise<ToolRun>,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const log = (workspaceId: string, success: boolean, credits?: number) =>
    logApiCall({
      workspaceId,
      tool,
      authVia: ctx.authVia,
      success,
      latencyMs: Date.now() - startedAt,
      credits,
    });

  const resolved = await resolveBrandParam(ctx, brand);
  if (!resolved.ok) {
    // Merk-resolutie faalde — log onder het default-merk van de caller.
    await log(ctx.workspaceId, false);
    return errorResult(resolved.error);
  }
  if (access === 'write') {
    const write = await requireWriteAccess(ctx, resolved.workspaceId);
    if (!write.ok) {
      await log(resolved.workspaceId, false);
      return errorResult(write.error);
    }
  }

  try {
    const { result, credits } = await fn(resolved.workspaceId);
    await log(resolved.workspaceId, result.isError !== true, credits);
    return result;
  } catch (err) {
    await log(resolved.workspaceId, false);
    return errorResult(err instanceof Error ? err.message : 'Tool execution failed');
  }
}

// ─── Brand-tools (context + score) ───────────────────────────

/**
 * Pre-flight credit-/trial-lock-blokkade voor een write-tool, vertaald naar een
 * nette tool-error i.p.v. de NextResponse die enforceCreditsForAction teruggeeft.
 * Null = doorgaan. Spiegelt de Gate-B-check van de REST-routes (audit 2026-07-23).
 */
async function enforceOrToolError(workspaceId: string, action: string): Promise<ToolRun | null> {
  const blocked = await enforceCreditsForAction(workspaceId, action, 1);
  if (!blocked) return null;
  const body = (await blocked.json().catch(() => null)) as { error?: string } | null;
  return { result: errorResult(body?.error ?? 'Onvoldoende credits of trial verlopen') };
}

function registerBrandTools(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'get_brand_context',
    {
      title: 'Get brand context',
      description:
        'De volledige merkcontext van een merk: brand assets, voice, personas, producten, ' +
        'concurrenten en positionering — dezelfde gelaagde context-stack die Branddock in elke ' +
        'AI-call injecteert. Gebruik dit als systemcontext om zelf on-brand te schrijven. Gratis.',
      inputSchema: { ...brandParam },
      annotations: { title: 'Get brand context', ...READ_TOOL },
    },
    async ({ brand }) =>
      runTool(ctx, 'get_brand_context', 'read', brand, async (workspaceId) => ({
        result: jsonResult(await getBrandContext(workspaceId)),
      })),
  );

  server.registerTool(
    'score_against_brand',
    {
      title: 'Score content against brand',
      description:
        'Beoordeelt aangeleverde tekst met F-VAL, dezelfde brand-fidelity-engine als de Branddock-UI: ' +
        'composietscore 0-100 (stijl/judge/regels), thresholdMet en concrete findings. ' +
        'Gebruik dit om content van elke bron on-brand te valideren vóór publicatie. Gratis.',
      inputSchema: {
        content: z
          .string()
          .min(50, 'content needs at least 50 characters for a meaningful score')
          .describe('De te beoordelen tekst (platte tekst, minimaal 50 tekens)'),
        ...brandParam,
      },
      annotations: { title: 'Score content against brand', ...READ_TOOL },
    },
    async ({ content, brand }) =>
      runTool(ctx, 'score_against_brand', 'read', brand, async (workspaceId) => {
        const review = await runFidelityForExternalContent({
          workspaceId,
          contentText: content,
          sourceType: 'paste',
        });
        return {
          result: jsonResult({
            compositeScore: review.result.compositeScore,
            thresholdMet: review.result.thresholdMet,
            findingsCount: review.findingsCount,
            result: review.result,
          }),
        };
      }),
  );
}

// ─── generate_on_brand ───────────────────────────────────────

const generateSchema = z.object({
  contentType: z
    .string()
    .min(1)
    .describe('Content-type-slug uit de Branddock-catalogus, bijv. "linkedin-post"'),
  title: z.string().max(120).optional().describe('Titel van het content-item (default: het content-type)'),
  campaignId: z
    .string()
    .optional()
    .describe('Bestaande campagne-id; zonder wordt de "Quick Content"-campagne gebruikt'),
  brief: z
    .object({
      objective: z.string().optional().describe('Doel van het content-item'),
      keyMessage: z.string().optional().describe('Kernboodschap'),
      toneDirection: z.string().optional().describe('Toon-richting'),
      callToAction: z.string().optional().describe('Call-to-action'),
    })
    .describe('Content-brief — bij genereren is minimaal objective of keyMessage vereist'),
  contextSelection: z
    .object({
      personaIds: z.array(z.string()).optional(),
      productIds: z.array(z.string()).optional(),
      competitorIds: z.array(z.string()).optional(),
      knowledgeResourceIds: z.array(z.string()).optional(),
    })
    .optional()
    .describe(
      'Workspace-gescopede kennis-selectie (ids via list_personas/list_products/list_competitors/search_knowledge)',
    ),
  generate: z
    .boolean()
    .optional()
    .describe('false = alleen aanmaken (geen AI-generatie, geen credits); default true'),
});

type GenerateArgs = z.infer<typeof generateSchema>;

/** Zelfde flow en credit-patroon als POST /api/v1/generate — bewust gedeelde idempotency-key. */
async function runGenerate(workspaceId: string, args: GenerateArgs): Promise<ToolRun> {
  const gate = await enforceOrToolError(workspaceId, 'short');
  if (gate) return gate;
  const result = await createAndGenerateDeliverable({ workspaceId, ...args });
  if (!result.ok) {
    return { result: errorResult(`${result.code}: ${result.error}`) };
  }

  const generated = args.generate !== false && result.generationError === null;
  if (generated) {
    // Post-hoc afboeking, idempotent per deliverable (deelt de key met de
    // REST-route zodat een item nooit dubbel afgeboekt kan worden).
    await chargeAfter(
      {
        workspaceId,
        action: 'short',
        feature: 'mcp-generate',
        idempotencyKey: `public-api:${result.deliverableId}`,
      },
      { count: 1 },
    ).catch(() => {});
  }

  return {
    result: jsonResult({
      deliverableId: result.deliverableId,
      campaignId: result.campaignId,
      title: result.title,
      generated,
      fidelityScore: result.fidelityScore,
      contentText: result.contentText,
      generationError: result.generationError,
    }),
    credits: generated ? GENERATE_CREDITS : 0,
  };
}

function registerGenerateTool(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'generate_on_brand',
    {
      title: 'Generate on-brand content',
      description:
        'Genereert een on-brand content-item via de volledige Branddock-pipeline: maakt een echt ' +
        'Deliverable aan (direct zichtbaar in de content-library), genereert de content met de ' +
        'complete merkcontext, scoort het resultaat met F-VAL en geeft de gegenereerde tekst ' +
        '(contentText) direct terug. Kost credits bij generatie.',
      inputSchema: { ...generateSchema.shape, ...brandParam },
      annotations: { title: 'Generate on-brand content', ...WRITE_TOOL },
    },
    async ({ brand, ...args }) =>
      runTool(ctx, 'generate_on_brand', 'write', brand, (workspaceId) => runGenerate(workspaceId, args)),
  );
}

// ─── rewrite_on_brand (ephemeral — Fase C) ───────────────────

function registerRewriteTool(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'rewrite_on_brand',
    {
      title: 'Rewrite or reply on brand',
      description:
        'Herschrijft aangeleverde tekst in de merkstem, of schrijft een on-brand antwoord op een ' +
        'bericht (intent "reply") — ideaal voor mails, comments en bestaande copy. Ephemeral: er ' +
        'wordt NIETS opgeslagen in Branddock (geen content-item). Kost 1 credit per aanroep.',
      inputSchema: {
        content: z.string().min(20).describe('De tekst om te herschrijven, of het bericht om te beantwoorden'),
        intent: z.enum(['rewrite', 'reply']).optional().describe('"rewrite" (default) of "reply"'),
        instruction: z.string().optional().describe('Vrije sturing, bijv. "korter", "formeler", "benadruk duurzaamheid"'),
        personaIds: z.array(z.string()).optional().describe('Doelgroep-personas (ids via list_personas)'),
        productIds: z.array(z.string()).optional().describe('Relevante producten (ids via list_products)'),
        ...brandParam,
      },
      annotations: { title: 'Rewrite or reply on brand', ...WRITE_TOOL },
    },
    async ({ brand, ...args }) =>
      runTool(ctx, 'rewrite_on_brand', 'write', brand, async (workspaceId) => {
        const gate = await enforceOrToolError(workspaceId, 'short');
        if (gate) return gate;
        const result = await rewriteOnBrand({ workspaceId, ...args });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return { result: jsonResult({ text: result.text, model: result.model }), credits: 1 };
      }),
  );
}

// ─── Campaign-strategy (async — Fase D4) ─────────────────────

const strategyGenerateSchema = z.object({
  briefing: z
    .string()
    .min(30, 'briefing needs at least 30 characters')
    .describe('Vrije-tekst campagne-brief: aanleiding, doelgroep, kernboodschap, wensen (minimaal 30 tekens)'),
  campaignGoalType: z
    .string()
    .min(1)
    .describe('Goal-type-id uit de Branddock-catalogus, bijv. "BRAND_AWARENESS", "PRODUCT_LAUNCH" of "LEAD_GENERATION"'),
  campaignTitle: z.string().max(120).optional().describe('Titel van de campagne (default: afgeleid van het goal-type)'),
  personaIds: z
    .array(z.string())
    .optional()
    .describe('Doelgroep-personas (ids via list_personas); zonder selectie worden alle workspace-personas gebruikt'),
  productIds: z.array(z.string()).optional().describe('Relevante producten (ids via list_products)'),
  competitorIds: z.array(z.string()).optional().describe('Relevante concurrenten (ids via list_competitors)'),
  mode: z
    .enum(['quick', 'full'])
    .optional()
    .describe('"quick" (default, snelste pad) of "full" (multi-model insights + concepts + creative debate — duurt langer)'),
  createDeliverables: z
    .boolean()
    .optional()
    .describe('true = maak ook de content-items uit het asset-plan aan in de campagne (opt-in; default false)'),
  campaignId: z.string().optional().describe('Bestaande campagne zonder strategie; zonder wordt een nieuwe campagne gemaakt'),
});

function registerStrategyTools(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'generate_campaign_strategy',
    {
      title: 'Generate campaign strategy',
      description:
        'Start de volledige Branddock campaign-strategy-chain als achtergrond-job: menselijk inzicht, ' +
        'creatief concept, strategie, journey-fases en kanaal-/asset-plan — opgeslagen op een echte ' +
        'campagne (direct zichtbaar in de UI). Draait ASYNC en duurt minuten: je krijgt direct een ' +
        'campaignId + jobId terug; poll de voortgang met get_strategy_status. Kost credits bij succes.',
      inputSchema: { ...strategyGenerateSchema.shape, ...brandParam },
      annotations: { title: 'Generate campaign strategy', ...WRITE_TOOL },
    },
    async ({ brand, ...args }) =>
      runTool(ctx, 'generate_campaign_strategy', 'write', brand, async (workspaceId) => {
        const gate = await enforceOrToolError(workspaceId, 'long-form');
        if (gate) return gate;
        const result = await startCampaignStrategyGeneration({ workspaceId, ...args });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return {
          result: jsonResult({
            campaignId: result.campaignId,
            jobId: result.jobId,
            status: 'queued',
            deduped: result.deduped,
            note: 'Generation runs in the background and takes several minutes. Poll get_strategy_status with this campaignId.',
          }),
        };
      }),
  );

  server.registerTool(
    'get_strategy_status',
    {
      title: 'Get strategy generation status',
      description:
        'Status van een gestarte campaign-strategy-generatie: queued/running/completed/failed, of het ' +
        'blueprint al op de campagne staat (hasStrategy) en hoeveel deliverables er zijn aangemaakt. Gratis.',
      inputSchema: {
        campaignId: z.string().describe('De campaignId uit generate_campaign_strategy'),
        ...brandParam,
      },
      annotations: { title: 'Get strategy generation status', ...READ_TOOL },
    },
    async ({ campaignId, brand }) =>
      runTool(ctx, 'get_strategy_status', 'read', brand, async (workspaceId) => {
        const result = await getStrategyStatus(workspaceId, campaignId);
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return {
          result: jsonResult({
            campaignId: result.campaignId,
            status: result.status,
            error: result.error,
            hasStrategy: result.hasStrategy,
            deliverablesCreated: result.deliverablesCreated,
          }),
        };
      }),
  );
}

// ─── Discovery-reads ─────────────────────────────────────────

function registerListTool(
  server: McpServer,
  ctx: PublicMcpContext,
  name: string,
  title: string,
  description: string,
  fetcher: (wsId: string) => Promise<unknown[]>,
): void {
  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema: { ...brandParam },
      annotations: { title, ...READ_TOOL },
    },
    async ({ brand }) =>
      runTool(ctx, name, 'read', brand, async (workspaceId) => {
        const items = await fetcher(workspaceId);
        return { result: jsonResult({ count: items.length, items }) };
      }),
  );
}

function registerDiscoveryTools(server: McpServer, ctx: PublicMcpContext): void {
  registerListTool(
    server,
    ctx,
    'list_personas',
    'List personas',
    `Alle personas van een merk (id, naam, tagline, beroep; max ${MAX_ROWS}). Gebruik de ids in contextSelection.personaIds van generate_on_brand.`,
    (wsId) =>
      prisma.persona.findMany({
        where: { workspaceId: wsId },
        select: { id: true, name: true, tagline: true, occupation: true },
        orderBy: { name: 'asc' },
        take: MAX_ROWS,
      }),
  );

  registerListTool(
    server,
    ctx,
    'list_products',
    'List products',
    `Alle producten van een merk (id, naam, categorie, status; max ${MAX_ROWS}). Gebruik de ids in contextSelection.productIds van generate_on_brand.`,
    (wsId) =>
      prisma.product.findMany({
        where: { workspaceId: wsId },
        select: { id: true, name: true, category: true, status: true },
        orderBy: { name: 'asc' },
        take: MAX_ROWS,
      }),
  );

  registerListTool(
    server,
    ctx,
    'list_competitors',
    'List competitors',
    `Alle concurrenten van een merk (id, naam, tagline, website; max ${MAX_ROWS}). Gebruik de ids in contextSelection.competitorIds van generate_on_brand.`,
    (wsId) =>
      prisma.competitor.findMany({
        where: { workspaceId: wsId },
        select: { id: true, name: true, tagline: true, websiteUrl: true },
        orderBy: { name: 'asc' },
        take: MAX_ROWS,
      }),
  );

  server.registerTool(
    'search_knowledge',
    {
      title: 'Search knowledge resources',
      description:
        `Zoekt kennisbronnen van een merk op titel (id, titel, type, categorie; max ${MAX_ROWS}). ` +
        'Gebruik de ids in contextSelection.knowledgeResourceIds van generate_on_brand.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Zoekterm — case-insensitive match op de titel; leeg = recentste items'),
        ...brandParam,
      },
      annotations: { title: 'Search knowledge resources', ...READ_TOOL },
    },
    async ({ query, brand }) =>
      runTool(ctx, 'search_knowledge', 'read', brand, async (workspaceId) => {
        const items = await prisma.knowledgeResource.findMany({
          where: {
            workspaceId,
            isArchived: false,
            ...(query?.trim() ? { title: { contains: query.trim(), mode: 'insensitive' } } : {}),
          },
          select: { id: true, title: true, type: true, category: true },
          orderBy: { createdAt: 'desc' },
          take: MAX_ROWS,
        });
        return { result: jsonResult({ count: items.length, items }) };
      }),
  );
}

// ─── list_brands ("merken zijn taal") ────────────────────────

function registerBrandDirectoryTool(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'list_brands',
    {
      title: 'List brands',
      description:
        'Alle merken (workspaces) die deze koppeling kan gebruiken: workspace-id, merknaam, ' +
        'organisatie, jouw rol en welk merk nu het default is. OAuth: alle merken waar je lid ' +
        'van bent — of alleen het vergrendelde merk bij een consent-slot; API-key: alleen het ' +
        'key-merk. Gebruik het workspace-id of de naam als `brand`-parameter op elke andere tool. Gratis.',
      annotations: { title: 'List brands', ...READ_TOOL },
    },
    async () =>
      runTool(ctx, 'list_brands', 'read', undefined, async () => {
        const brands = await listBrandsForContext(ctx);
        return { result: jsonResult({ count: brands.length, brands }) };
      }),
  );
}

// ─── get_deliverable_content ─────────────────────────────────

function registerDeliverableContentTool(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'get_deliverable_content',
    {
      title: 'Get deliverable content',
      description:
        'De volledige inhoud van een content-item: titel, content-type, status, recentste ' +
        'F-VAL-score en alle componenten (tekst, image-URL, video-URL, variant-/selectie-info) ' +
        'gesorteerd op volgorde. Gebruik het deliverableId uit generate_on_brand of de content-library. Gratis.',
      inputSchema: {
        id: z.string().min(1).describe('Het deliverable-id'),
        ...brandParam,
      },
      annotations: { title: 'Get deliverable content', ...READ_TOOL },
    },
    async ({ id, brand }) =>
      runTool(ctx, 'get_deliverable_content', 'read', brand, async (workspaceId) => {
        const result = await getDeliverableContent(workspaceId, id);
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return { result: jsonResult(result.deliverable) };
      }),
  );
}

// ─── generate_image ──────────────────────────────────────────

function registerImageTool(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'generate_image',
    {
      title: 'Generate on-brand image',
      description:
        'Genereert een on-brand beeld en slaat het op in de Media Library van het merk ' +
        `(fal.ai FLUX/Recraft/Ideogram, Google Imagen of DALL-E; default ${DEFAULT_IMAGE_PROVIDER}). ` +
        'Merk-richtlijnen (fotografie-richting, design-taal, persoonlijkheid) gaan default mee in de ' +
        'prompt. Retourneert de opgeslagen beeld-URL. Kost 2 credits.',
      inputSchema: {
        prompt: z.string().min(1).max(1000).describe('Wat er op het beeld moet staan'),
        name: z.string().min(1).max(200).optional().describe('Naam in de Media Library (default: afgeleid van de prompt)'),
        provider: z
          .string()
          .min(1)
          .optional()
          .describe(`"fal-ai/…", "IMAGEN" of "DALLE" (default ${DEFAULT_IMAGE_PROVIDER})`),
        aspectRatio: z
          .enum(['1:1', '16:9', '9:16', '3:4', '4:3'])
          .optional()
          .describe('Beeldverhouding (default 1:1; DALL-E gebruikt size)'),
        size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Alleen DALL-E'),
        quality: z.enum(['standard', 'hd']).optional().describe('Alleen DALL-E'),
        style: z.enum(['vivid', 'natural']).optional().describe('Alleen DALL-E'),
        applyBrandGuidelines: z
          .boolean()
          .optional()
          .describe('false = pure prompt zonder merk-richtlijnen (default true)'),
        ...brandParam,
      },
      annotations: { title: 'Generate on-brand image', ...WRITE_TOOL },
    },
    async ({ brand, ...args }) =>
      runTool(ctx, 'generate_image', 'write', brand, async (workspaceId) => {
        // Zelfde pre-flight als de Media-Library-route (Gate B): 402-blok bij
        // ontoereikend saldo — hier vertaald naar een nette tool-error.
        const blocked = await enforceCreditsForAction(workspaceId, 'image', 1);
        if (blocked) {
          const body = (await blocked.json().catch(() => null)) as { error?: string } | null;
          return { result: errorResult(body?.error ?? 'Insufficient credits for image generation') };
        }

        const result = await generateBrandImage({
          workspaceId,
          ...args,
          ...(ctx.userId ? { createdByUserId: ctx.userId } : {}),
        });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return {
          result: jsonResult({
            image: result.image,
            note: 'Opgeslagen in de Media Library van dit merk.',
          }),
          credits: IMAGE_CREDITS,
        };
      }),
  );
}

// ─── import_brand_data (werkbestand-flow) ────────────────────

const importToneDimensions = z
  .object({
    formalCasual: z.number().int().min(1).max(7),
    seriousFunny: z.number().int().min(1).max(7),
    respectfulIrreverent: z.number().int().min(1).max(7),
    matterOfFactEnthusiastic: z.number().int().min(1).max(7),
  })
  .describe('NN/g 4-assen tone-baseline, elk 1-7 (4 = neutraal; 1 = formeel/serieus/respectvol/zakelijk)');

// Payload-bounds: publiek write-endpoint — begrens aantallen en tekstlengtes
// zodat één call geen onbegrensde row-/query-fanout kan triggeren.
const MAX_IMPORT_ITEMS = 50;
const shortText = z.string().max(2_000);
const longText = z.string().max(20_000);
const textList = z.array(z.string().max(2_000)).max(100);
// URL-velden worden elders als href gerenderd en (websiteUrl) gescrapet —
// zelfde validatie-strengheid als de UI-routes, plus scheme-allowlist.
const httpUrl = z
  .string()
  .max(2_000)
  .regex(/^https?:\/\/\S+$/, 'moet een absolute http(s)-URL zijn');
const httpUrlList = z.array(httpUrl).max(50);

const importSchema = z.object({
  contentLanguage: z
    .string()
    .regex(/^[a-z]{2}$/, 'ISO 639-1 lowercase, bijv. "nl"')
    .optional()
    .describe('ISO 639-1 workspace-taal, bijv. "nl" — zet Workspace.contentLanguage'),
  brandAssets: z
    .array(
      z.object({
        slug: z
          .string()
          .max(50)
          .describe('Canonieke asset-slug, bijv. "golden-circle", "core-values", "brand-story"'),
        frameworkData: z
          .record(z.string(), z.unknown())
          .refine((v) => JSON.stringify(v).length <= 50_000, 'frameworkData te groot (max 50KB geserialiseerd)')
          .describe('Framework-velden — exacte keys per frameworkType; wordt diep gemerged over bestaande data'),
        content: longText.optional().describe('Optionele vrije-tekst aanvulling'),
      }),
    )
    .max(11)
    .optional()
    .describe('De 11 canonieke brand assets (deel 1 van het werkbestand)'),
  voiceguide: z
    .object({
      voiceDescription: longText.optional(),
      toneDimensions: importToneDimensions.optional(),
      wordsWeUse: textList.optional(),
      wordsWeAvoid: textList.optional(),
      vocabularyDo: textList.optional(),
      vocabularyDont: textList.optional(),
      antiPatterns: textList.optional(),
      examplePhrases: z
        .array(z.object({ text: shortText, type: z.enum(['do', 'dont']) }))
        .max(100)
        .optional(),
      voiceSample: longText.optional(),
      writingSamples: z.array(z.string().max(20_000)).max(20).optional(),
      contentGuidelines: textList.optional(),
      writingGuidelines: textList.optional(),
      channelTones: z
        .partialRecord(
          z.enum(['website', 'socialMedia', 'email', 'ads', 'video']),
          z.object({ description: shortText }),
        )
        .optional(),
      contentLocale: z.enum(['nl-NL', 'nl-BE', 'en-GB', 'de-DE']).optional(),
    })
    .optional()
    .describe('Brand voice (deel 2 van het werkbestand) — upsert op de workspace-voiceguide'),
  personas: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        tagline: shortText.optional(),
        age: shortText.optional(),
        gender: shortText.optional(),
        location: shortText.optional(),
        occupation: shortText.optional(),
        education: shortText.optional(),
        income: shortText.optional(),
        familyStatus: shortText.optional(),
        personalityType: shortText.optional(),
        bio: longText.optional(),
        quote: shortText.optional(),
        coreValues: textList.optional(),
        interests: textList.optional(),
        goals: textList.optional(),
        motivations: textList.optional(),
        frustrations: textList.optional(),
        behaviors: textList.optional(),
        preferredChannels: textList.optional(),
        techStack: textList.optional(),
        buyingTriggers: textList.optional(),
        decisionCriteria: textList.optional(),
        strategicImplications: longText.optional(),
      }),
    )
    .max(MAX_IMPORT_ITEMS)
    .optional()
    .describe('Personas (deel 4) — match op naam binnen het merk'),
  products: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        category: shortText.optional(),
        description: longText.optional(),
        pricingModel: shortText.optional(),
        pricingDetails: longText.optional(),
        sourceUrl: httpUrl.optional(),
        features: textList.optional(),
        benefits: textList.optional(),
        useCases: textList.optional(),
        personaNames: z.array(z.string().max(200)).max(MAX_IMPORT_ITEMS).optional(),
      }),
    )
    .max(MAX_IMPORT_ITEMS)
    .optional()
    .describe('Producten/diensten (deel 5) — match op naam binnen het merk'),
  competitors: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        websiteUrl: httpUrl.optional(),
        tier: z.enum(['DIRECT', 'INDIRECT', 'ASPIRATIONAL']).optional(),
        tagline: shortText.optional(),
        headquarters: shortText.optional(),
        employeeRange: shortText.optional(),
        description: longText.optional(),
        valueProposition: longText.optional(),
        targetAudience: longText.optional(),
        mainOfferings: textList.optional(),
        differentiators: textList.optional(),
        strengths: textList.optional(),
        weaknesses: textList.optional(),
        pricingModel: shortText.optional(),
        pricingDetails: longText.optional(),
        toneOfVoice: longText.optional(),
      }),
    )
    .max(MAX_IMPORT_ITEMS)
    .optional()
    .describe('Concurrenten (deel 6) — match op naam binnen het merk'),
  trends: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: longText.min(1),
        category: z
          .enum(['TECHNOLOGY', 'CONSUMER_BEHAVIOR', 'MARKET_DYNAMICS', 'COMPETITIVE', 'REGULATORY'])
          .optional()
          .describe('Trend Radar-categorie'),
        impact: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
        timeframe: z.enum(['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']).optional(),
        direction: z.enum(['rising', 'stable', 'declining']).optional(),
        keyInsights: longText.optional().describe('Wat betekent deze trend voor het merk (howToUse)'),
        sources: httpUrlList.optional().describe('Bron-URL\'s'),
      }),
    )
    .max(MAX_IMPORT_ITEMS)
    .optional()
    .describe('Trends (deel 7) — landen in de Trend Radar; match op titel binnen het merk'),
  knowledgeResources: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: longText.min(1),
        type: z
          .enum(['document', 'article', 'book', 'website', 'video', 'image', 'podcast', 'course'])
          .optional(),
        author: shortText.optional(),
        url: httpUrl.optional(),
        content: z.string().max(200_000).optional().describe('Volledige tekst-body — gaat mee in AI-context'),
      }),
    )
    .max(MAX_IMPORT_ITEMS)
    .optional()
    .describe('Kennisbronnen (deel 8) — match op titel binnen het merk'),
});

// Drift-guards: het zod-schema en BrandImportPayload worden parallel
// onderhouden — deze asserts breken de build zodra een top-level sectie in
// één van beide ontbreekt (stille key-strip door zod wordt zo zichtbaar).
type ImportSchemaPayload = z.infer<typeof importSchema>;
type AssertNever<T extends never> = T;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ImportKeysMissingInSchema = AssertNever<
  Exclude<keyof BrandImportPayload, keyof ImportSchemaPayload>
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ImportKeysExtraInSchema = AssertNever<
  Exclude<keyof ImportSchemaPayload, keyof BrandImportPayload>
>;

/**
 * Alléén op de API-key-route. Dit is de enige tool die bestaand merk-DNA
 * overschrijft, en over de OAuth-connector is de aanroeper doorgaans zelf
 * eigenaar van zijn workspace — een rol-check beschermt daar dus niemand. Een
 * key is een bewuste, per-merk vergrendelde handeling (Settings → API &
 * Connectors); dat is het juiste toegangsniveau voor een schrijf-op-merk-DNA.
 * Gevolg: in Claude/ChatGPT is de tool niet zichtbaar en dus ook niet
 * aanroepbaar — geen "vul mijn merkprofiel even aan" dat er echt één overschrijft.
 */
function registerImportTool(server: McpServer, ctx: PublicMcpContext): void {
  if (ctx.authVia !== 'api_key') return;

  server.registerTool(
    'import_brand_data',
    {
      title: 'Import brand data',
      description:
        'Laadt merkonderdelen idempotent in een merk: brand assets (frameworkData per canonieke slug), ' +
        'brand voice, personas, producten, concurrenten, trends en kennisbronnen — de werkbestand-flow ' +
        '(docs/templates/werkbestand-merkonderdelen.md). Upserts op natuurlijke sleutels: bestaande ' +
        'records worden bijgewerkt (alleen aangeleverde velden), vergrendelde records overgeslagen. ' +
        'Retourneert een rapport met created/updated/skipped per onderdeel. Gratis.',
      inputSchema: { ...importSchema.shape, ...brandParam },
      annotations: { title: 'Import brand data', ...WRITE_TOOL },
    },
    async ({ brand, ...payload }) =>
      runTool(ctx, 'import_brand_data', 'write', brand, async (workspaceId) => {
        const data: BrandImportPayload = payload;
        const report = await importBrandData(workspaceId, data, { userId: ctx.userId });
        return { result: jsonResult(report) };
      }),
  );
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Bouwt een verse McpServer met de publieke brand-tools, gebonden aan de
 * auth-context (bd_live-key óf OAuth-token — zie PublicMcpContext). Eén
 * server per request (stateless) — de route sluit hem na afhandeling weer.
 *
 * Toolset per auth-vorm: 17 tools over de OAuth-connector (claude.ai/ChatGPT),
 * 18 met een API-key — `import_brand_data` is key-only, zie registerImportTool.
 */
export function createPublicMcpServer(ctx: PublicMcpContext): McpServer {
  const server = new McpServer({
    name: 'branddock-brand-api',
    title: 'Branddock',
    version: '1.1.1',
    // Connector-branding: clients (o.a. claude.ai) tonen anders een generiek
    // icoon. Het beeldmerk wordt site-breed geserveerd via src/app/icon.png.
    websiteUrl: 'https://branddock.app',
    icons: [{ src: 'https://branddock.app/icon.png', mimeType: 'image/png', sizes: ['512x512'] }],
  });
  registerBrandTools(server, ctx);
  registerGenerateTool(server, ctx);
  registerRewriteTool(server, ctx);
  registerStrategyTools(server, ctx);
  registerSpecializedChainTools(server, ctx);
  registerDiscoveryTools(server, ctx);
  registerBrandDirectoryTool(server, ctx);
  registerDeliverableContentTool(server, ctx);
  registerImageTool(server, ctx);
  registerImportTool(server, ctx);
  return server;
}

// ─── Gespecialiseerde chains: SEO (async), web-page, video (Fase D1-D3) ──────

const chainContextSelection = z
  .object({
    personaIds: z.array(z.string()).optional(),
    productIds: z.array(z.string()).optional(),
    competitorIds: z.array(z.string()).optional(),
    knowledgeResourceIds: z.array(z.string()).optional(),
  })
  .optional()
  .describe('Workspace-gescopede kennis-selectie (ids via de list_*/search_knowledge-tools)');

function registerSpecializedChainTools(server: McpServer, ctx: PublicMcpContext): void {
  server.registerTool(
    'generate_long_form_seo',
    {
      title: 'Generate long-form SEO content (async)',
      description:
        'Start de 8-staps SEO/GEO-pipeline (keyword-research → outline → long-form artikel) als ' +
        'async job. Duurt ±7-8 minuten; poll met get_seo_status. Kost 80 credits bij afronding. ' +
        'Vereist een long-form/website-content-type (bijv. blog-post, pillar-page, landing-page).',
      inputSchema: {
        contentType: z.string().optional().describe('Long-form/website-type (default via deliverableId)'),
        deliverableId: z.string().optional().describe('Bestaand deliverable; zonder wordt er een aangemaakt'),
        title: z.string().max(120).optional(),
        campaignId: z.string().optional(),
        primaryKeyword: z.string().min(1).describe('Het primaire zoekwoord'),
        funnelStage: z.enum(['awareness', 'consideration', 'decision']),
        secondaryKeywordHints: z.array(z.string()).optional(),
        contextSelection: chainContextSelection,
        ...brandParam,
      },
      annotations: { title: 'Generate long-form SEO content (async)', ...WRITE_TOOL },
    },
    async ({ brand, contentType, deliverableId, title, campaignId, primaryKeyword, funnelStage, secondaryKeywordHints, contextSelection }) =>
      runTool(ctx, 'generate_long_form_seo', 'write', brand, async (workspaceId) => {
        const gate = await enforceOrToolError(workspaceId, 'long-form');
        if (gate) return gate;
        const result = await startSeoGeneration({
          workspaceId,
          deliverableId,
          contentType,
          title,
          campaignId,
          contextSelection,
          seoInput: { primaryKeyword, funnelStage, secondaryKeywordHints },
        });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return {
          result: jsonResult({
            deliverableId: result.deliverableId,
            jobId: result.jobId,
            status: 'queued',
            note: 'Poll get_seo_status met deze jobId; 80 credits worden bij afronding geboekt.',
          }),
        };
      }),
  );

  server.registerTool(
    'get_seo_status',
    {
      title: 'Get SEO generation status',
      description: 'Voortgang van een generate_long_form_seo-job (stap 0-8, labels, fouten). Gratis.',
      inputSchema: { jobId: z.string().min(1), ...brandParam },
      annotations: { title: 'Get SEO generation status', ...READ_TOOL },
    },
    async ({ jobId, brand }) =>
      runTool(ctx, 'get_seo_status', 'read', brand, async (workspaceId) => {
        const status = await getSeoStatus(workspaceId, jobId);
        if (!status) return { result: errorResult('Job not found in this workspace') };
        return { result: jsonResult(status) };
      }),
  );

  server.registerTool(
    'generate_web_page',
    {
      title: 'Generate on-brand web page',
      description:
        'Genereert een complete on-brand webpagina (Puck-tree) uit een free-text prompt via de ' +
        'per-type template-builder. Persisteert op het deliverable — direct zichtbaar en ' +
        'publiceerbaar in Branddock. Types: landing-page, product-page, faq-page, comparison-page, ' +
        'microsite. Kost 5 credits bij AI-vulling.',
      inputSchema: {
        prompt: z.string().min(5).describe('Free-text brief voor de pagina'),
        contentType: z.string().optional().describe('Web-page-type (default landing-page)'),
        deliverableId: z.string().optional(),
        title: z.string().max(120).optional(),
        campaignId: z.string().optional(),
        contextSelection: chainContextSelection,
        ...brandParam,
      },
      annotations: { title: 'Generate on-brand web page', ...WRITE_TOOL },
    },
    async ({ brand, prompt, contentType, deliverableId, title, campaignId, contextSelection }) =>
      runTool(ctx, 'generate_web_page', 'write', brand, async (workspaceId) => {
        const gate = await enforceOrToolError(workspaceId, 'short');
        if (gate) return gate;
        const result = await generateWebPage({ workspaceId, prompt, contentType, deliverableId, title, campaignId, contextSelection });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        const tree = result.puckData as { content?: unknown[] };
        return {
          result: jsonResult({
            deliverableId: result.deliverableId,
            campaignId: result.campaignId,
            source: result.source,
            componentCount: Array.isArray(tree?.content) ? tree.content.length : null,
            note: 'puckData is op het deliverable gepersisteerd — bekijk/bewerk/publiceer in Branddock.',
          }),
          credits: result.source === 'ai' ? GENERATE_CREDITS : 0,
        };
      }),
  );

  server.registerTool(
    'generate_video',
    {
      title: 'Generate on-brand video clip',
      description:
        'Genereert een korte on-brand videoclip uit een script (brand-aware video-prompt → ' +
        'fal-provider → opslag als geselecteerde video-component). Duurt 1-5 minuten binnen de ' +
        'aanroep. Providers: kling-v3-pro, veo-3-1-fast, seedance-2-0, ltx-2-pro, kling-v3-std ' +
        '(elk met eigen toegestane duur/aspect-ratio). Kost 20 credits.',
      inputSchema: {
        scriptText: z.string().min(1).max(5000),
        provider: z.string().min(1).describe('fal-provider-id'),
        duration: z.number().int().min(3).max(15).describe('Seconden — moet in de allowedDurations van de provider vallen'),
        aspectRatio: z.string().describe('Bijv. "16:9" of "9:16" — provider-afhankelijk'),
        deliverableId: z.string().optional(),
        contentType: z.string().optional().describe('Default tiktok-script bij aanmaak'),
        title: z.string().max(120).optional(),
        campaignId: z.string().optional(),
        sourceImageUrl: z.string().url().optional().describe('Remote https-URL voor image-to-video'),
        motionPrompt: z.string().max(500).optional(),
        ...brandParam,
      },
      annotations: { title: 'Generate on-brand video clip', ...WRITE_TOOL },
    },
    async ({ brand, ...args }) =>
      runTool(ctx, 'generate_video', 'write', brand, async (workspaceId) => {
        const gate = await enforceOrToolError(workspaceId, 'video-clip');
        if (gate) return gate;
        const result = await generateVideoClip({ workspaceId, ...args });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return {
          result: jsonResult({
            deliverableId: result.deliverableId,
            videoUrl: result.videoUrl,
            provider: result.provider,
          }),
          credits: 20,
        };
      }),
  );
}
