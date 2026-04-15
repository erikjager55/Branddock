import { prisma } from '@/lib/prisma';
import { getBrandContext } from '@/lib/ai/brand-context';
import { formatBrandContext } from '@/lib/ai/prompt-templates';
import type { ContextSelection, ContextModule, ClawAttachment } from './claw.types';

const MAX_CONTEXT_TOKENS_ESTIMATE = 12_000;
const AVG_CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS_ESTIMATE * AVG_CHARS_PER_TOKEN;

/**
 * Build the system prompt for the Claw assistant.
 * Assembles brand context from selected modules + attachments.
 */
export async function assembleSystemPrompt(
  workspaceId: string,
  selection: ContextSelection,
  attachments?: ClawAttachment[]
): Promise<{ systemPrompt: string; estimatedTokens: number }> {
  const sections: string[] = [];

  // ── Identity ─────────────────────────────────────────────
  sections.push(SYSTEM_IDENTITY);

  // ── Brand context (compact, always included) ─────────────
  if (selection.modules.includes('brand_assets') || selection.modules.includes('brandstyle')) {
    const brandCtx = await getBrandContext(workspaceId);
    const formatted = formatBrandContext(brandCtx);
    sections.push(formatted);
  }

  // ── Per-module detailed context ──────────────────────────
  const modulePromises: Promise<string | null>[] = [];

  for (const mod of selection.modules) {
    const entityIds = selection.entityIds?.[mod];
    modulePromises.push(fetchModuleContext(workspaceId, mod, entityIds));
  }

  const moduleResults = await Promise.all(modulePromises);
  for (const result of moduleResults) {
    if (result) sections.push(result);
  }

  // ── Attachments ──────────────────────────────────────────
  if (attachments?.length) {
    const attachmentSection = formatAttachments(attachments);
    sections.push(attachmentSection);
  }

  // ── Assemble + truncate ──────────────────────────────────
  let systemPrompt = sections.join('\n\n---\n\n');

  if (systemPrompt.length > MAX_CONTEXT_CHARS) {
    systemPrompt = systemPrompt.slice(0, MAX_CONTEXT_CHARS) + '\n\n[Context truncated due to size limit]';
  }

  const estimatedTokens = Math.ceil(systemPrompt.length / AVG_CHARS_PER_TOKEN);

  return { systemPrompt, estimatedTokens };
}

/**
 * Estimate token count for a context selection (for UI indicator).
 */
export function estimateContextTokens(
  moduleCount: number,
  attachmentChars: number
): number {
  const baseTokens = 400; // system identity
  const perModuleTokens = 800; // average per module
  const attachmentTokens = Math.ceil(attachmentChars / AVG_CHARS_PER_TOKEN);
  return baseTokens + moduleCount * perModuleTokens + attachmentTokens;
}

// ─── System Identity ──────────────────────────────────────

const SYSTEM_IDENTITY = `You are the AI brand strategist assistant for Brandclaw.

Your role:
- Answer questions about the user's brand, strategy, personas, products, and campaigns
- Suggest improvements to brand assets, personas, and content
- Modify data when the user asks (via tools — always confirm before writing)
- Provide strategic advice grounded in the brand's actual data
- Be concise, actionable, and specific to THIS brand — never generic

Rules:
- Always use the provided brand context to ground your answers
- When suggesting changes, reference the specific field and current value
- Use tools to read data you need — don't guess or make up brand information
- For write actions: always explain what you want to change and why before calling the tool
- Respond in the same language the user writes in
- Be direct and professional — no unnecessary filler`;

// ─── Module Context Fetchers ──────────────────────────────

async function fetchModuleContext(
  workspaceId: string,
  module: ContextModule,
  entityIds?: string[]
): Promise<string | null> {
  switch (module) {
    case 'brand_assets':
      // Already included via getBrandContext — skip detailed fetch unless specific IDs
      if (!entityIds?.length) return null;
      return fetchBrandAssetDetails(workspaceId, entityIds);

    case 'brandstyle':
      // Already included via getBrandContext
      return null;

    case 'personas':
      return fetchPersonaContext(workspaceId, entityIds);

    case 'products':
      return fetchProductContext(workspaceId, entityIds);

    case 'competitors':
      return fetchCompetitorContext(workspaceId, entityIds);

    case 'trends':
      return fetchTrendContext(workspaceId);

    case 'strategies':
      return fetchStrategyContext(workspaceId, entityIds);

    case 'campaigns':
      return fetchCampaignContext(workspaceId, entityIds);

    case 'alignment':
      return fetchAlignmentContext(workspaceId);

    case 'knowledge':
      return fetchKnowledgeContext(workspaceId);

    case 'dashboard':
      return fetchDashboardContext(workspaceId);

    default:
      return null;
  }
}

async function fetchBrandAssetDetails(workspaceId: string, ids: string[]): Promise<string | null> {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId, id: { in: ids } },
    select: { name: true, content: true, frameworkType: true, frameworkData: true },
  });
  if (!assets.length) return null;

  const lines = ['## Selected Brand Assets (Detail)'];
  for (const a of assets) {
    lines.push(`### ${a.name} (${a.frameworkType})`);
    if (a.content) lines.push(truncate(String(a.content), 500));
    if (a.frameworkData) lines.push('Framework: ' + truncate(JSON.stringify(a.frameworkData), 1000));
  }
  return lines.join('\n');
}

async function fetchPersonaContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const personas = await prisma.persona.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      id: true, name: true, age: true, location: true, occupation: true,
      goals: true, frustrations: true, motivations: true, quote: true,
      personalityType: true, interests: true,
      preferredChannels: true, buyingTriggers: true,
    },
    take: 10,
  });
  if (!personas.length) return null;

  const lines = ['## Personas'];
  for (const p of personas) {
    lines.push(`### ${p.name} (${p.age ?? '?'}, ${p.occupation ?? 'Unknown'})`);
    if (p.location) lines.push(`Location: ${p.location}`);
    if (p.quote) lines.push(`Quote: "${p.quote}"`);
    if (p.goals) lines.push(`Goals: ${formatArray(p.goals as string[])}`);
    if (p.frustrations) lines.push(`Frustrations: ${formatArray(p.frustrations as string[])}`);
    if (p.motivations) lines.push(`Motivations: ${formatArray(p.motivations as string[])}`);
    if (p.personalityType) lines.push(`Personality: ${p.personalityType}`);
    if (p.preferredChannels) lines.push(`Channels: ${formatArray(p.preferredChannels as string[])}`);
    if (p.buyingTriggers) lines.push(`Buying Triggers: ${formatArray(p.buyingTriggers as string[])}`);
  }
  return lines.join('\n');
}

async function fetchProductContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const products = await prisma.product.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      name: true, category: true, description: true, pricingDetails: true,
      features: true, benefits: true, useCases: true,
    },
    take: 10,
  });
  if (!products.length) return null;

  const lines = ['## Products & Services'];
  for (const p of products) {
    lines.push(`### ${p.name} (${p.category})`);
    if (p.description) lines.push(truncate(p.description, 300));
    if (p.pricingDetails) lines.push(`Pricing: ${String(p.pricingDetails)}`);
    if (p.features?.length) lines.push(`Features: ${(p.features as string[]).join(', ')}`);
    if (p.benefits?.length) lines.push(`Benefits: ${(p.benefits as string[]).join(', ')}`);
  }
  return lines.join('\n');
}

async function fetchCompetitorContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const competitors = await prisma.competitor.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      name: true, tier: true, competitiveScore: true,
      valueProposition: true, differentiators: true,
      strengths: true, weaknesses: true,
    },
    take: 10,
  });
  if (!competitors.length) return null;

  const lines = ['## Competitors'];
  for (const c of competitors) {
    lines.push(`### ${c.name} (${c.tier}, score: ${c.competitiveScore ?? 'N/A'})`);
    if (c.valueProposition) lines.push(`Value prop: ${truncate(c.valueProposition, 200)}`);
    if (c.strengths?.length) lines.push(`Strengths: ${(c.strengths as string[]).join(', ')}`);
    if (c.weaknesses?.length) lines.push(`Weaknesses: ${(c.weaknesses as string[]).join(', ')}`);
  }
  return lines.join('\n');
}

async function fetchTrendContext(workspaceId: string): Promise<string | null> {
  const trends = await prisma.detectedTrend.findMany({
    where: { workspaceId, isDismissed: false },
    select: { title: true, description: true, category: true, impactLevel: true, relevanceScore: true, whyNow: true },
    orderBy: { relevanceScore: 'desc' },
    take: 10,
  });
  if (!trends.length) return null;

  const lines = ['## Active Trends'];
  for (const t of trends) {
    lines.push(`- **${t.title}** (${t.category}, ${t.impactLevel}, relevance: ${t.relevanceScore})`);
    if (t.description) lines.push(`  ${truncate(t.description, 150)}`);
  }
  return lines.join('\n');
}

async function fetchStrategyContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const strategies = await prisma.businessStrategy.findMany({
    where: { workspaceId, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      name: true, type: true, status: true, progressPercentage: true,
      vision: true, rationale: true,
      objectives: { select: { title: true, status: true }, take: 5 },
    },
    take: 5,
  });
  if (!strategies.length) return null;

  const lines = ['## Business Strategies'];
  for (const s of strategies) {
    lines.push(`### ${s.name} (${s.status}, ${s.progressPercentage}%)`);
    if (s.vision) lines.push(`Vision: ${truncate(s.vision, 200)}`);
    if (s.objectives.length) {
      lines.push('Objectives:');
      for (const o of s.objectives) lines.push(`  - ${o.title} (${o.status})`);
    }
  }
  return lines.join('\n');
}

async function fetchCampaignContext(workspaceId: string, ids?: string[]): Promise<string | null> {
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId, type: { not: 'CONTENT' }, ...(ids?.length ? { id: { in: ids } } : {}) },
    select: {
      title: true, type: true, status: true, campaignGoalType: true,
      confidence: true,
      _count: { select: { deliverables: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  if (!campaigns.length) return null;

  const lines = ['## Campaigns'];
  for (const c of campaigns) {
    lines.push(`- **${c.title}** (${c.type}, ${c.status}, goal: ${c.campaignGoalType ?? 'N/A'}, confidence: ${c.confidence ?? 'N/A'}%, deliverables: ${c._count.deliverables})`);
  }
  return lines.join('\n');
}

async function fetchAlignmentContext(workspaceId: string): Promise<string | null> {
  const scan = await prisma.alignmentScan.findFirst({
    where: { workspaceId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    select: { score: true },
  });
  const issueCount = await prisma.alignmentIssue.count({
    where: { scan: { workspaceId }, status: 'OPEN' },
  });

  if (!scan) return null;
  return `## Brand Alignment\nOverall score: ${scan.score}% | Open issues: ${issueCount}`;
}

async function fetchKnowledgeContext(workspaceId: string): Promise<string | null> {
  const count = await prisma.knowledgeResource.count({ where: { workspaceId, isArchived: false } });
  const featured = await prisma.knowledgeResource.findMany({
    where: { workspaceId, isFeatured: true },
    select: { title: true, type: true },
    take: 5,
  });

  const lines = [`## Knowledge Library (${count} resources)`];
  if (featured.length) {
    lines.push('Featured:');
    for (const r of featured) lines.push(`  - ${r.title} (${r.type})`);
  }
  return lines.join('\n');
}

async function fetchDashboardContext(workspaceId: string): Promise<string | null> {
  const [assets, personas, strategies, campaigns] = await Promise.all([
    prisma.brandAsset.count({ where: { workspaceId } }),
    prisma.persona.count({ where: { workspaceId } }),
    prisma.businessStrategy.count({ where: { workspaceId, status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { workspaceId, status: 'ACTIVE', type: { not: 'CONTENT' } } }),
  ]);

  return `## Dashboard Stats\nBrand assets: ${assets} | Personas: ${personas} | Active strategies: ${strategies} | Active campaigns: ${campaigns}`;
}

// ─── Helpers ──────────────────────────────────────────────

function formatAttachments(attachments: ClawAttachment[]): string {
  const lines = ['## User Attachments'];
  for (const att of attachments) {
    lines.push(`### ${att.label} (${att.type})`);
    lines.push(truncate(att.content, 2000));
  }
  return lines.join('\n');
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function formatArray(arr: unknown): string {
  if (!Array.isArray(arr)) return String(arr ?? '');
  return arr.filter(Boolean).join(', ');
}
