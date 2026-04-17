import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

// Singleton
const globalForBugAnalysis = globalThis as unknown as { bugAnalysisClient: Anthropic | undefined };

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!globalForBugAnalysis.bugAnalysisClient) {
    globalForBugAnalysis.bugAnalysisClient = new Anthropic({ apiKey });
  }
  return globalForBugAnalysis.bugAnalysisClient;
}

/**
 * Page-to-context: fetch relevant workspace data based on the page where the bug was reported.
 */
async function fetchPageContext(workspaceId: string, page: string): Promise<string> {
  const sections: string[] = [];

  try {
    if (page.includes('brand') || page.includes('asset')) {
      const assets = await prisma.brandAsset.findMany({
        where: { workspaceId },
        select: { name: true, slug: true, frameworkType: true, status: true, content: true },
        take: 15,
      });
      sections.push(`## Brand Assets (${assets.length})\n${assets.map((a) => `- ${a.name} (${a.frameworkType}, status: ${a.status}, has content: ${!!a.content})`).join('\n')}`);
    }

    if (page.includes('persona')) {
      const personas = await prisma.persona.findMany({
        where: { workspaceId },
        select: { name: true, age: true, occupation: true, location: true },
        take: 10,
      });
      sections.push(`## Personas (${personas.length})\n${personas.map((p) => `- ${p.name} (${p.occupation ?? 'no occupation'}, ${p.location ?? 'no location'})`).join('\n')}`);
    }

    if (page.includes('campaign') || page.includes('content') || page.includes('canvas') || page.includes('wizard')) {
      const campaigns = await prisma.campaign.findMany({
        where: { workspaceId },
        select: { title: true, type: true, status: true, campaignGoalType: true },
        take: 10,
      });
      sections.push(`## Campaigns (${campaigns.length})\n${campaigns.map((c) => `- ${c.title} (type: ${c.type}, status: ${c.status}, goal: ${c.campaignGoalType ?? 'none'})`).join('\n')}`);
    }

    if (page.includes('product')) {
      const products = await prisma.product.findMany({
        where: { workspaceId },
        select: { name: true, category: true, status: true },
        take: 10,
      });
      sections.push(`## Products (${products.length})\n${products.map((p) => `- ${p.name} (${p.category}, ${p.status})`).join('\n')}`);
    }

    if (page.includes('competitor')) {
      const competitors = await prisma.competitor.findMany({
        where: { workspaceId },
        select: { name: true, tier: true, competitiveScore: true },
        take: 10,
      });
      sections.push(`## Competitors (${competitors.length})\n${competitors.map((c) => `- ${c.name} (tier: ${c.tier}, score: ${c.competitiveScore ?? 'n/a'})`).join('\n')}`);
    }

    if (page.includes('trend')) {
      const trends = await prisma.detectedTrend.findMany({
        where: { workspaceId },
        select: { title: true, category: true, impactLevel: true, isActivated: true },
        take: 10,
      });
      sections.push(`## Trends (${trends.length})\n${trends.map((t) => `- ${t.title} (${t.category}, impact: ${t.impactLevel}, active: ${t.isActivated})`).join('\n')}`);
    }

    if (page.includes('style') || page.includes('brandstyle')) {
      const styleguide = await prisma.brandStyleguide.findFirst({
        where: { workspaceId },
        select: { status: true, primaryFontName: true },
      });
      if (styleguide) {
        sections.push(`## Brandstyle\nStatus: ${styleguide.status}, Font: ${styleguide.primaryFontName ?? 'none'}`);
      }
    }
  } catch (err) {
    sections.push(`[Context fetch error: ${String(err)}]`);
  }

  if (sections.length === 0) {
    // Fallback: basic workspace info
    const workspace = await prisma.workspace.findFirst({
      where: { id: workspaceId },
      select: { name: true },
    });
    sections.push(`## Workspace\nName: ${workspace?.name ?? 'Unknown'}\nPage: ${page}`);
  }

  return sections.join('\n\n');
}

const SYSTEM_PROMPT = `You are a senior frontend engineer and UX specialist debugging the Branddock platform — a Next.js 16 / React 19 SaaS app for brand strategy and AI content generation.

Given a bug report and relevant workspace data, provide a clear, actionable fix suggestion. Structure your response as:

1. **Root Cause Analysis** — What is most likely causing this bug?
2. **Suggested Fix** — Specific steps to fix it (mention components, data flow, API routes if relevant)
3. **Verification** — How to verify the fix works

Keep it concise and practical. If the bug is a data issue, suggest the specific data changes. If it's a UI issue, reference likely component patterns (Tailwind classes, React state, etc). If you lack context, say so and suggest what additional info would help.`;

/**
 * Analyze a bug report using Claude and store the suggestion.
 * Fire-and-forget — call without awaiting from the POST handler.
 */
export async function analyzeBugReport(bugId: string, workspaceId: string): Promise<void> {
  // Mark as analyzing
  await prisma.bugReport.update({
    where: { id: bugId },
    data: { aiStatus: 'analyzing' },
  });

  try {
    const bug = await prisma.bugReport.findUniqueOrThrow({
      where: { id: bugId },
      select: { page: true, description: true, severity: true, screenshot: true },
    });

    const context = await fetchPageContext(workspaceId, bug.page);

    const userPrompt = [
      `## Bug Report`,
      `- **Page**: ${bug.page}`,
      `- **Severity**: ${bug.severity}`,
      `- **Description**: ${bug.description}`,
      bug.screenshot ? `- **Screenshot**: ${bug.screenshot}` : null,
      '',
      `## Workspace Context`,
      context,
    ].filter(Boolean).join('\n');

    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const suggestion = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    await prisma.bugReport.update({
      where: { id: bugId },
      data: {
        aiSuggestion: suggestion,
        aiStatus: 'ready',
      },
    });
  } catch (err) {
    console.error(`[bug-analysis] Failed for bug ${bugId}:`, err);
    await prisma.bugReport.update({
      where: { id: bugId },
      data: {
        aiStatus: 'failed',
        aiSuggestion: `Analysis failed: ${String(err)}`,
      },
    });
  }
}
