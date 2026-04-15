/**
 * AI-Driven Creative Selection — Uses a fast LLM call to select
 * Goldenberg templates AND generate context-specific creative angles.
 *
 * Previous version picked from a fixed list of 22 "bisociation domains"
 * (mythology, architecture, cartography, etc.) which produced repetitive,
 * abstract results. This version lets the AI propose creative territories
 * that are unexpected BUT relevant for the specific brand + insight.
 *
 * What stays: Goldenberg creativity templates (8 proven structural patterns).
 * What's replaced: fixed bisociation domains → AI-generated creative angles.
 */

import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import { GOLDENBERG_TEMPLATES, TEMPLATE_INSIGHT_AFFINITY, type GoldenbergTemplateDefinition } from '@/lib/goldenberg/goldenberg-templates';
import type { HumanInsight } from './strategy-blueprint.types';

// ─── Types ────────────────────────────────────────────────

export interface CreativeSelectionContext {
  brandContext: string;
  personaContext: string;
  goalType: string;
  insight: HumanInsight;
  briefing?: { occasion?: string; audienceObjective?: string; coreMessage?: string };
}

/**
 * AI-generated creative angle — replaces the fixed bisociation domain.
 * Each angle is a specific metaphor world that the AI found to be
 * emotionally resonant with the brand + insight combination.
 */
export interface CreativeAngle {
  /** Short name (e.g. "Japanese Joinery", "Haute Couture Detailing") */
  name: string;
  /** Why this angle works for THIS brand + insight (1-2 sentences) */
  connectionToInsight: string;
  /** Concrete visual/narrative possibilities (1-2 sentences) */
  visualPotential: string;
  /** Emotional territory this angle opens up */
  emotionalTerritory: string;
}

export interface CreativeSelectionResult {
  templates: GoldenbergTemplateDefinition[];
  angles: CreativeAngle[];
}

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

// ─── Template Catalog ──────────────────────────────────────

function formatTemplateCatalog(): string {
  return GOLDENBERG_TEMPLATES.map((t) =>
    `- **${t.id}**: ${t.name} — ${t.mechanism} (e.g. ${t.examples[0]?.brand}: ${t.examples[0]?.howItApplied})`
  ).join('\n');
}

function formatAffinityHints(insight: HumanInsight): string {
  const lens = detectInsightLens(insight);
  const sorted = Object.entries(TEMPLATE_INSIGHT_AFFINITY)
    .sort(([, a], [, b]) => b[lens] - a[lens]);
  return `Detected insight lens: **${lens}**. Template affinity:\n${sorted.slice(0, 4).map(([id, scores]) => `- ${id}: ${scores[lens]}/10`).join('\n')}`;
}

// ─── Selection Cache ──────────────────────────────────────

/** In-memory cache keyed on goalType + insight statement. Survives retry/regeneration within same server instance. */
const selectionCache = new Map<string, { result: CreativeSelectionResult; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildCacheKey(ctx: CreativeSelectionContext): string {
  return `${ctx.goalType}::${ctx.insight.insightStatement?.slice(0, 100) ?? ''}`;
}

// ─── Main Selection ────────────────────────────────────────

/**
 * Uses Gemini Flash to select 3 Goldenberg templates AND generate
 * 3 context-specific creative angles that are unexpected but relevant.
 * Results are cached per goalType + insight for retry/regeneration speed.
 */
export async function selectCreativeMaterials(
  ctx: CreativeSelectionContext,
): Promise<CreativeSelectionResult> {
  // Check cache first — avoids repeated LLM call on retry/regeneration
  const cacheKey = buildCacheKey(ctx);
  const cached = selectionCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }
  try {
    const systemPrompt = `You are an award-winning creative director who finds unexpected but powerful connections between brands and metaphor worlds.

Your task: select 3 Goldenberg creativity templates AND invent 3 creative angles for a campaign.

## CRITICAL RULES FOR CREATIVE ANGLES
- Each angle must come from a DIFFERENT domain of human experience
- Angles must be UNEXPECTED for this industry — avoid the obvious
- Angles must be EMOTIONALLY RESONANT with the insight and audience
- Angles must have strong VISUAL/NARRATIVE potential for advertising
- DO NOT use generic abstract domains like "mythology", "architecture", "cartography", "astronomy", "oceanography" — these are overused and lazy
- Instead, find SPECIFIC, VIVID metaphor worlds from:
  - Specific crafts, professions, or skills (e.g. "Watchmaking precision", "Jazz improvisation", "Surgical confidence")
  - Cultural practices or rituals (e.g. "Japanese tea ceremony", "Italian piazza culture", "Scandinavian hygge")
  - Natural phenomena or processes (e.g. "Tidal rhythms", "Mycelium networks", "Crystal formation")
  - Art movements or techniques (e.g. "Bauhaus functionalism", "Kintsugi repair", "Trompe l'oeil")
  - Human experiences or transitions (e.g. "First steps", "Coming home", "That moment of silence before applause")

## Template Affinity Hints
${formatAffinityHints(ctx.insight)}

## Available Goldenberg Templates
${formatTemplateCatalog()}

Return JSON with:
- templateIds: array of exactly 3 template IDs from the list
- angles: array of exactly 3 objects, each with: name (string, 2-4 words), connectionToInsight (string, 1-2 sentences), visualPotential (string, 1-2 sentences), emotionalTerritory (string, 1-2 words)`;

    const userPrompt = `## Brand
${ctx.brandContext.slice(0, 2000)}

## Target Audience
${ctx.personaContext.slice(0, 1000)}

## Campaign Goal: ${ctx.goalType}
${ctx.briefing?.occasion ? `Why now: ${ctx.briefing.occasion}` : ''}
${ctx.briefing?.coreMessage ? `Core message: ${ctx.briefing.coreMessage}` : ''}

## Human Insight
"${ctx.insight.insightStatement}"
Tension: ${ctx.insight.underlyingTension}
Emotional territory: ${ctx.insight.emotionalTerritory}
Human truth: ${ctx.insight.humanTruth}

Find 3 Goldenberg templates and 3 creative angles that would make THIS specific brand + insight combination unforgettable.`;

    const result = await createGeminiStructuredCompletion<{
      templateIds: string[];
      angles: CreativeAngle[];
      reasoning?: string;
    }>(
      systemPrompt,
      userPrompt,
      { model: 'gemini-2.5-flash', temperature: 0.9 },
    );

    const templates = resolveTemplates(result.templateIds ?? []);
    const angles = (result.angles ?? []).filter(
      (a) => a.name && a.connectionToInsight && a.visualPotential,
    ).slice(0, 3);

    if (templates.length >= 2 && angles.length >= 2) {
      const selected = {
        templates: templates.slice(0, 3),
        angles: fillAngles(angles, 3),
      };
      selectionCache.set(cacheKey, { result: selected, ts: Date.now() });
      return selected;
    }

    const fallback = fallbackSelection(ctx.insight);
    selectionCache.set(cacheKey, { result: fallback, ts: Date.now() });
    return fallback;
  } catch (error) {
    console.warn('[ai-creative-selector] AI selection failed, using fallback:', error);
    return fallbackSelection(ctx.insight);
  }
}

// ─── Helpers ────────────────────────────────────────────────

function resolveTemplates(ids: string[]): GoldenbergTemplateDefinition[] {
  const result: GoldenbergTemplateDefinition[] = [];
  for (const id of ids) {
    const found = GOLDENBERG_TEMPLATES.find((t) => t.id === id);
    if (found && !result.includes(found)) result.push(found);
  }
  return result;
}

/** Pad angles to target count with generic fallbacks if AI returned fewer */
function fillAngles(angles: CreativeAngle[], target: number): CreativeAngle[] {
  const fallbacks: CreativeAngle[] = [
    { name: 'Hidden craftsmanship', connectionToInsight: 'The best work is invisible — it just feels right.', visualPotential: 'Close-up details, behind-the-scenes processes, maker hands.', emotionalTerritory: 'pride' },
    { name: 'Threshold moments', connectionToInsight: 'Every meaningful change starts with crossing a boundary.', visualPotential: 'Doorways, transitions, before/after contrasts.', emotionalTerritory: 'anticipation' },
    { name: 'Quiet confidence', connectionToInsight: 'True quality doesn\'t need to shout.', visualPotential: 'Understated elegance, negative space, whispered strength.', emotionalTerritory: 'trust' },
  ];
  const result = [...angles];
  let i = 0;
  while (result.length < target && i < fallbacks.length) {
    if (!result.some((a) => a.name === fallbacks[i].name)) {
      result.push(fallbacks[i]);
    }
    i++;
  }
  return result;
}

function fallbackSelection(insight?: HumanInsight): CreativeSelectionResult {
  const lens = insight ? detectInsightLens(insight) : 'empathy';
  const weighted = GOLDENBERG_TEMPLATES.map(t => ({
    template: t,
    weight: TEMPLATE_INSIGHT_AFFINITY[t.id]?.[lens] ?? 5,
  }));
  const templates = weightedRandomPick(weighted, 3);

  const fallbackAngles: CreativeAngle[] = [
    { name: 'Hidden craftsmanship', connectionToInsight: 'The best work is invisible — it just feels right.', visualPotential: 'Close-up details, behind-the-scenes processes, maker hands.', emotionalTerritory: 'pride' },
    { name: 'Threshold moments', connectionToInsight: 'Every meaningful change starts with crossing a boundary.', visualPotential: 'Doorways, transitions, before/after contrasts.', emotionalTerritory: 'anticipation' },
    { name: 'Quiet confidence', connectionToInsight: 'True quality doesn\'t need to shout.', visualPotential: 'Understated elegance, negative space, whispered strength.', emotionalTerritory: 'trust' },
  ];

  return { templates, angles: fallbackAngles };
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
