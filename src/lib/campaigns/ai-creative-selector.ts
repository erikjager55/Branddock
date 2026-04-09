/**
 * AI-Driven Creative Selection — Uses a fast LLM call to select the best
 * Goldenberg templates and bisociation domains for a specific campaign context.
 *
 * Instead of deterministic hash-based selection, the AI considers:
 * - Brand identity, values, and industry
 * - Target audience (personas)
 * - Campaign goal and briefing
 * - The selected human insight
 * - Emotional fit between domains and the brand
 *
 * Falls back to deterministic selection if the AI call fails.
 */

import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { GOLDENBERG_TEMPLATES, TEMPLATE_INSIGHT_AFFINITY, type GoldenbergTemplateDefinition } from '@/lib/goldenberg/goldenberg-templates';
import { BISOCIATION_DOMAINS, type BisociationDomainDefinition } from '@/lib/goldenberg/bisociation-domains';
import type { HumanInsight } from './strategy-blueprint.types';

// ─── Insight Lens Detection ─────────────────────────────────

function detectInsightLens(insight: HumanInsight): 'empathy' | 'tension' | 'behavior' {
  const text = `${insight.insightStatement} ${insight.underlyingTension} ${insight.emotionalTerritory}`.toLowerCase();
  const tensionWords = ['tension', 'conflict', 'paradox', 'contradiction', 'versus', 'but', 'however', 'despite'];
  const behaviorWords = ['behavior', 'habit', 'routine', 'choice', 'decision', 'action', 'barrier', 'trigger'];
  const tensionScore = tensionWords.filter(w => text.includes(w)).length;
  const behaviorScore = behaviorWords.filter(w => text.includes(w)).length;
  if (tensionScore > behaviorScore && tensionScore > 1) return 'tension';
  if (behaviorScore > tensionScore && behaviorScore > 1) return 'behavior';
  return 'empathy';
}

// ─── Types ────────────────────────────────────────────────

export interface CreativeSelectionContext {
  brandContext: string;
  personaContext: string;
  goalType: string;
  insight: HumanInsight;
  briefing?: { occasion?: string; audienceObjective?: string; coreMessage?: string };
}

export interface CreativeSelectionResult {
  templates: GoldenbergTemplateDefinition[];
  domains: BisociationDomainDefinition[];
}

// ─── Catalog Formatters ──────────────────────────────────

function formatTemplateCatalog(): string {
  return GOLDENBERG_TEMPLATES.map((t) =>
    `- **${t.id}**: ${t.name} — ${t.mechanism} (e.g. ${t.examples[0]?.brand}: ${t.examples[0]?.howItApplied})`
  ).join('\n');
}

function formatDomainCatalog(): string {
  return BISOCIATION_DOMAINS.map((d) =>
    `- **${d.id}**: ${d.name} — metaphors: ${d.visualMetaphors.slice(0, 2).join(', ')}; emotions: ${d.emotionalTerritories.join(', ')}`
  ).join('\n');
}

function formatAffinityHints(insight: HumanInsight): string {
  const lens = detectInsightLens(insight);
  const sorted = Object.entries(TEMPLATE_INSIGHT_AFFINITY)
    .sort(([, a], [, b]) => b[lens] - a[lens]);
  return `Detected insight lens: **${lens}**. Template affinity ranking for this lens:\n${sorted.map(([id, scores]) => `- ${id}: ${scores[lens]}/10`).join('\n')}`;
}

// ─── AI Selection ─────────────────────────────────────────

/**
 * Uses a fast LLM (Gemini Flash) to select 3 Goldenberg templates and
 * 3 bisociation domains that best fit the campaign context.
 *
 * The AI considers emotional resonance with the insight, brand personality fit,
 * audience relevance, and creative potential for the goal type.
 */
export async function selectCreativeMaterials(
  ctx: CreativeSelectionContext,
): Promise<CreativeSelectionResult> {
  try {
    const systemPrompt = `You are a creative strategist selecting the best creative frameworks for a campaign.

Given the brand context, target audience, campaign goal, and human insight below, select:
1. **3 Goldenberg creativity templates** — the structural patterns that best amplify this insight for this brand and audience
2. **3 bisociation domains** — the cross-domain metaphor sources that create the strongest emotional connection between the insight and the brand

## Selection Criteria
- Templates: Which structural pattern would make this insight most MEMORABLE and SURPRISING for this specific audience?
- Domains: Which metaphor world would create the most EMOTIONALLY RESONANT connection with this brand's personality and the audience's world?
- Avoid domains too close to the brand's own industry (e.g., don't pick "sports" for a fitness brand)
- Ensure DIVERSITY: pick 3 domains from DIFFERENT emotional territories
- Consider what would STAND OUT in this brand's competitive landscape

## Template-Insight Affinity Hints
${formatAffinityHints(ctx.insight)}

## Available Goldenberg Templates
${formatTemplateCatalog()}

## Available Bisociation Domains
${formatDomainCatalog()}

Return a JSON object with:
- templateIds: array of exactly 3 template IDs from the list above
- domainIds: array of exactly 3 domain IDs from the list above
- reasoning: one sentence explaining why this combination works for this specific campaign`;

    const userPrompt = `## Brand Context
${ctx.brandContext.slice(0, 2000)}

## Target Audience
${ctx.personaContext.slice(0, 1000)}

## Campaign Goal
${ctx.goalType}
${ctx.briefing?.occasion ? `Occasion: ${ctx.briefing.occasion}` : ''}
${ctx.briefing?.audienceObjective ? `Audience objective: ${ctx.briefing.audienceObjective}` : ''}
${ctx.briefing?.coreMessage ? `Core message: ${ctx.briefing.coreMessage}` : ''}

## Selected Human Insight
"${ctx.insight.insightStatement}"
Tension: ${ctx.insight.underlyingTension}
Emotional territory: ${ctx.insight.emotionalTerritory}
Human truth: ${ctx.insight.humanTruth}

Now select the 3 best templates and 3 best domains for THIS specific campaign.`;

    const result = await createGeminiStructuredCompletion<{
      templateIds: string[];
      domainIds: string[];
      reasoning: string;
    }>(
      systemPrompt,
      userPrompt,
      { model: 'gemini-2.5-flash', temperature: 0.7 },
    );

    // Resolve IDs back to definitions
    const templates = resolveTemplates(result.templateIds);
    const domains = resolveDomains(result.domainIds);

    if (templates.length === 3 && domains.length === 3) {
      return { templates, domains };
    }

    // Partial match — fill gaps with fallback
    return fillGaps(templates, domains);
  } catch (error) {
    console.warn('[ai-creative-selector] AI selection failed, using fallback:', error);
    return fallbackSelection(ctx.insight);
  }
}

// ─── Resolution Helpers ──────────────────────────────────

function resolveTemplates(ids: string[]): GoldenbergTemplateDefinition[] {
  const result: GoldenbergTemplateDefinition[] = [];
  for (const id of ids) {
    const found = GOLDENBERG_TEMPLATES.find((t) => t.id === id);
    if (found && !result.includes(found)) result.push(found);
  }
  return result;
}

function resolveDomains(ids: string[]): BisociationDomainDefinition[] {
  const result: BisociationDomainDefinition[] = [];
  for (const id of ids) {
    const found = BISOCIATION_DOMAINS.find((d) => d.id === id);
    if (found && !result.includes(found)) result.push(found);
  }
  return result;
}

function fillGaps(
  templates: GoldenbergTemplateDefinition[],
  domains: BisociationDomainDefinition[],
): CreativeSelectionResult {
  // Shuffle remaining options and fill
  const remainingTemplates = GOLDENBERG_TEMPLATES.filter((t) => !templates.includes(t));
  const remainingDomains = BISOCIATION_DOMAINS.filter((d) => !domains.includes(d));
  shuffle(remainingTemplates);
  shuffle(remainingDomains);

  while (templates.length < 3 && remainingTemplates.length > 0) {
    templates.push(remainingTemplates.pop()!);
  }
  while (domains.length < 3 && remainingDomains.length > 0) {
    domains.push(remainingDomains.pop()!);
  }

  return { templates, domains };
}

function fallbackSelection(insight?: HumanInsight): CreativeSelectionResult {
  // Weighted random selection based on insight affinity
  if (insight) {
    const lens = detectInsightLens(insight);
    const weighted = GOLDENBERG_TEMPLATES.map(t => ({
      template: t,
      weight: TEMPLATE_INSIGHT_AFFINITY[t.id]?.[lens] ?? 5,
    }));
    const selected = weightedRandomPick(weighted, 3);
    const domains = [...BISOCIATION_DOMAINS];
    shuffle(domains);
    return { templates: selected, domains: domains.slice(0, 3) };
  }
  const templates = [...GOLDENBERG_TEMPLATES];
  const domains = [...BISOCIATION_DOMAINS];
  shuffle(templates);
  shuffle(domains);
  return {
    templates: templates.slice(0, 3),
    domains: domains.slice(0, 3),
  };
}

function weightedRandomPick(
  items: Array<{ template: GoldenbergTemplateDefinition; weight: number }>,
  count: number,
): GoldenbergTemplateDefinition[] {
  const remaining = [...items];
  const result: GoldenbergTemplateDefinition[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    let picked = remaining[0];
    for (const item of remaining) {
      rand -= item.weight;
      if (rand <= 0) { picked = item; break; }
    }
    result.push(picked.template);
    remaining.splice(remaining.indexOf(picked), 1);
  }
  return result;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
