// =============================================================
// Publieke Brand-API — MCP-server (Fase B, ADR 2026-07-17-public-brand-api).
//
// Bouwt per request een verse McpServer met de 7 publieke brand-tools,
// gebonden aan de workspace van de API-key (stateless serverless-patroon —
// zie src/app/api/mcp/route.ts). Tweede-deur-principe: elke tool loopt door
// exact dezelfde services als de UI en de REST-routes (/api/v1/*), dus
// resultaten zijn 1-op-1 vergelijkbaar en writes zijn direct zichtbaar in
// de content-library. Elke tool-aanroep logt metadata-only naar ApiCallLog
// (fail-soft — logging laat een geslaagde aanroep nooit falen).
// =============================================================

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { runFidelityForExternalContent } from '@/lib/brand-fidelity/external-content-runner';
import { createAndGenerateDeliverable } from '@/lib/content/headless-create';
import { rewriteOnBrand } from '@/lib/content/rewrite-on-brand';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { logApiCall } from '@/lib/api/public/usage';

/** Discovery-reads zijn bewust gecapt — agents hebben een shortlist nodig, geen dump. */
const MAX_ROWS = 50;
/** Vlakke 'short'-afboeking per gegenereerd item — zelfde tarief als /api/v1/generate. */
const GENERATE_CREDITS = 5;

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

/**
 * Draait een tool-handler met latency-meting + metadata-only usage-log.
 * Throws worden een nette tool-error (isError) zodat de MCP-client een
 * leesbare fout krijgt i.p.v. een protocol-level crash.
 */
async function tracked(
  workspaceId: string,
  tool: string,
  fn: () => Promise<ToolRun>,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  try {
    const { result, credits } = await fn();
    await logApiCall({
      workspaceId,
      tool,
      authVia: 'api_key',
      success: result.isError !== true,
      latencyMs: Date.now() - startedAt,
      credits,
    });
    return result;
  } catch (err) {
    await logApiCall({
      workspaceId,
      tool,
      authVia: 'api_key',
      success: false,
      latencyMs: Date.now() - startedAt,
    });
    return errorResult(err instanceof Error ? err.message : 'Tool execution failed');
  }
}

// ─── Brand-tools (context + score) ───────────────────────────

function registerBrandTools(server: McpServer, workspaceId: string): void {
  server.registerTool(
    'get_brand_context',
    {
      title: 'Get brand context',
      description:
        'De volledige merkcontext van deze workspace: brand assets, voice, personas, producten, ' +
        'concurrenten en positionering — dezelfde gelaagde context-stack die Branddock in elke ' +
        'AI-call injecteert. Gebruik dit als systemcontext om zelf on-brand te schrijven. Gratis.',
    },
    async () =>
      tracked(workspaceId, 'get_brand_context', async () => ({
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
      },
    },
    async ({ content }) =>
      tracked(workspaceId, 'score_against_brand', async () => {
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
      generationError: result.generationError,
    }),
    credits: generated ? GENERATE_CREDITS : 0,
  };
}

function registerGenerateTool(server: McpServer, workspaceId: string): void {
  server.registerTool(
    'generate_on_brand',
    {
      title: 'Generate on-brand content',
      description:
        'Genereert een on-brand content-item via de volledige Branddock-pipeline: maakt een echt ' +
        'Deliverable aan (direct zichtbaar in de content-library), genereert de content met de ' +
        'complete merkcontext en scoort het resultaat met F-VAL. Kost credits bij generatie.',
      inputSchema: generateSchema.shape,
    },
    async (args) => tracked(workspaceId, 'generate_on_brand', () => runGenerate(workspaceId, args)),
  );
}

// ─── rewrite_on_brand (ephemeral — Fase C) ───────────────────

function registerRewriteTool(server: McpServer, workspaceId: string): void {
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
      },
    },
    async (args) =>
      tracked(workspaceId, 'rewrite_on_brand', async () => {
        const result = await rewriteOnBrand({ workspaceId, ...args });
        if (!result.ok) return { result: errorResult(`${result.code}: ${result.error}`) };
        return { result: jsonResult({ text: result.text, model: result.model }), credits: 1 };
      }),
  );
}

// ─── Discovery-reads ─────────────────────────────────────────

function registerListTool(
  server: McpServer,
  workspaceId: string,
  name: string,
  description: string,
  fetcher: (wsId: string) => Promise<unknown[]>,
): void {
  server.registerTool(name, { description }, async () =>
    tracked(workspaceId, name, async () => {
      const items = await fetcher(workspaceId);
      return { result: jsonResult({ count: items.length, items }) };
    }),
  );
}

function registerDiscoveryTools(server: McpServer, workspaceId: string): void {
  registerListTool(
    server,
    workspaceId,
    'list_personas',
    `Alle personas van deze workspace (id, naam, tagline, beroep; max ${MAX_ROWS}). Gebruik de ids in contextSelection.personaIds van generate_on_brand.`,
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
    workspaceId,
    'list_products',
    `Alle producten van deze workspace (id, naam, categorie, status; max ${MAX_ROWS}). Gebruik de ids in contextSelection.productIds van generate_on_brand.`,
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
    workspaceId,
    'list_competitors',
    `Alle concurrenten van deze workspace (id, naam, tagline, website; max ${MAX_ROWS}). Gebruik de ids in contextSelection.competitorIds van generate_on_brand.`,
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
        `Zoekt kennisbronnen van deze workspace op titel (id, titel, type, categorie; max ${MAX_ROWS}). ` +
        'Gebruik de ids in contextSelection.knowledgeResourceIds van generate_on_brand.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Zoekterm — case-insensitive match op de titel; leeg = recentste items'),
      },
    },
    async ({ query }) =>
      tracked(workspaceId, 'search_knowledge', async () => {
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

// ─── Public API ──────────────────────────────────────────────

/**
 * Bouwt een verse McpServer met de 8 publieke brand-tools, gebonden aan de
 * workspace van de aanroepende API-key. Eén server per request (stateless) —
 * de route sluit hem na afhandeling weer.
 */
export function createPublicMcpServer(workspaceId: string): McpServer {
  const server = new McpServer({ name: 'branddock-brand-api', version: '1.0.0' });
  registerBrandTools(server, workspaceId);
  registerGenerateTool(server, workspaceId);
  registerRewriteTool(server, workspaceId);
  registerDiscoveryTools(server, workspaceId);
  return server;
}
