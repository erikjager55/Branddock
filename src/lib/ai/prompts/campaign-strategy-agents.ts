// =============================================================================
// Multi-Agent Campaign Strategy — Critic, Defense & Persona Panel Prompts
// Extends the 3-variant pipeline with adversarial debate rounds.
// =============================================================================

import type { StrategyLayer, ArchitectureLayer, AgentCritique } from '@/lib/campaigns/strategy-blueprint.types';
import { GOAL_LABELS, getGoalTypeGuidance } from '@/features/campaigns/lib/goal-types';

// ─── Critic Agent Prompt ──────────────────────────────────────

interface CriticPromptParams {
  strategyA: string;
  architectureA: string;
  strategyB: string;
  architectureB: string;
  brandContext: string;
  personaContext: string;
  goalType: string;
  goalGuidance: string;
}

export function buildCriticPrompt(params: CriticPromptParams): { system: string; user: string } {
  const goalLabel = GOAL_LABELS[params.goalType] ?? params.goalType;

  const system = `You are a senior strategic critic and brand auditor with 20+ years of experience evaluating campaign strategies for Effie Award submissions.

Your job is NOT to create strategy — it is to FIND WEAKNESSES that the strategists missed. You receive two campaign strategy variants (A and B) created by independent AI strategists for the same brief.

## Your Critical Framework

1. **Evidence Test**: Is every claim backed by brand context, persona data, or marketing science? Flag unsupported assertions.
2. **Distinctiveness Test (Neumeier)**: Would this strategy work for ANY brand in this category, or is it uniquely ownable? If interchangeable, flag as CRITICAL weakness.
3. **Persona Reality Check**: Does this strategy match how the target personas actually think, feel, and behave — based on the provided persona data? Or is it what the strategist WISHES they would do?
4. **Blind Spot Detection**: What audiences, channels, objections, or competitive responses have the strategists NOT considered?
5. **Risk Assessment**: What could go wrong? Brand safety, cultural sensitivity, execution complexity, budget feasibility.
6. **Convergence Alert**: Where do Variant A and B overlap too much? Both variants should offer genuinely different strategic paths — flag where they converge.
7. **Effie Criteria Test**: Does the strategy have a genuine human insight (not a brand observation)? Is the creative platform ownable and distinctive?

## Rules
- Be SPECIFIC. "The messaging is weak" is useless. "The humanInsight in Variant A claims [X] but the persona data shows [Y]" is useful.
- Reference actual data from the brand context and persona profiles provided.
- For each weakness, suggest a DIRECTION for improvement (not a full solution — that's the strategist's job).
- Score your own confidence (1-10) in each overall assessment.
- The goal type is "${goalLabel}". ${params.goalGuidance}

## Output Format
Return a JSON object with two critique objects: one for Variant A and one for Variant B. Each must include:
- targetVariant: "A" or "B"
- strengths: array of { element, observation, evidence, severity }
- weaknesses: array of { element, observation, evidence, severity } where severity is "critical", "moderate", or "minor"
- blindSpots: array of strings describing what was missed entirely
- risks: array of { risk, likelihood, impact, mitigation }
- differentiationGap: string describing where A and B overlap too much
- overallAssessment: 2-3 sentence summary
- confidenceScore: number 1-10

IMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks.`;

  const user = `## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext}

## Variant A — Strategy Layer
${params.strategyA}

## Variant A — Architecture Layer
${params.architectureA}

## Variant B — Strategy Layer
${params.strategyB}

## Variant B — Architecture Layer
${params.architectureB}

Analyze both variants against the brand context and persona data. Identify strengths, weaknesses, blind spots, risks, and convergence gaps.

Return a JSON object with this structure:
{
  "critiqueOfA": { targetVariant, strengths, weaknesses, blindSpots, risks, differentiationGap, overallAssessment, confidenceScore },
  "critiqueOfB": { targetVariant, strengths, weaknesses, blindSpots, risks, differentiationGap, overallAssessment, confidenceScore }
}`;

  return { system, user };
}

// ─── Defense Agent Prompt ─────────────────────────────────────

interface DefensePromptParams {
  originalStrategy: string;
  originalArchitecture: string;
  critique: string;
  brandContext: string;
  personaContext: string;
  agentRole: 'strategist' | 'creative';
  variant: 'A' | 'B';
  goalType: string;
}

export function buildDefensePrompt(params: DefensePromptParams): { system: string; user: string } {
  const roleName = params.agentRole === 'strategist'
    ? 'Evidence-Based Marketing Strategist'
    : 'Creative Provocateur';

  const system = `You are the original ${roleName} who created Variant ${params.variant}. A strategic critic has reviewed your work and found weaknesses, blind spots, and risks.

Your job is to:

1. **Acknowledge valid criticism** — If the critic is right, IMPROVE your strategy. Don't be defensive about genuine weaknesses.
2. **Defend strong choices** — If the critic missed context or misunderstood your intent, explain WHY your choice is deliberate and evidence-based.
3. **Improve** — For every accepted weakness, provide a CONCRETE revision. Return the FULL revised StrategyLayer and ArchitectureLayer.
4. **Document changes** — List every change you made and why in the changeLog array.

## Rules
- You MUST return a COMPLETE revised strategy and architecture, not just patches.
- Your revised strategy should be BETTER than the original. This is your chance to strengthen your work.
- Do NOT abandon your core creative platform unless the critic found a fatal flaw. REFINE, don't restart.
- For each weakness you address, classify your response as:
  - "accepted": You agree, and you've changed the strategy to fix it.
  - "defended": You disagree, and you've explained why your original choice is better.
  - "partially_accepted": The critic has a point, but the fix is more nuanced than they suggest.
- The changeLog should be specific: "Changed humanInsight from '[old]' to '[new]' because critic correctly identified that persona data contradicts the original."

## Output Format
Return a JSON object with:
- variant: "${params.variant}"
- addressedWeaknesses: array of { originalWeakness, response, reasoning, action }
- addressedBlindSpots: array of strings explaining how each blind spot was handled
- revisedElements: array of { field, before, after, reason }
- revisedStrategy: complete StrategyLayer object (all fields)
- revisedArchitecture: complete ArchitectureLayer object (all fields)
- changeLog: array of human-readable change descriptions

IMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks.`;

  const user = `## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext}

## Your Original Strategy (Variant ${params.variant})
${params.originalStrategy}

## Your Original Architecture (Variant ${params.variant})
${params.originalArchitecture}

## Critic's Review of Your Work
${params.critique}

Address each weakness and blind spot. Return your improved strategy and architecture as a complete JSON object.`;

  return { system, user };
}

// ─── Persona Panel Prompt ─────────────────────────────────────

interface PersonaPanelPromptParams {
  revisedStrategyA: string;
  revisedArchitectureA: string;
  revisedStrategyB: string;
  revisedArchitectureB: string;
  critiqueOfA: string;
  critiqueOfB: string;
  defenseA: string;
  defenseB: string;
  personas: string;
  brandContext: string;
  goalType: string;
}

export function buildPersonaPanelPrompt(params: PersonaPanelPromptParams): { system: string; user: string } {
  const goalLabel = GOAL_LABELS[params.goalType] ?? params.goalType;

  const system = `You are simulating a focus group of real people evaluating two campaign strategy variants. Each persona is a DISTINCT INDIVIDUAL with their own voice, vocabulary, emotional triggers, and decision-making patterns.

## For EACH persona provided, you must:

1. **Stay in character** — Use language and references that match their demographics, psychographics, and communication style. A 24-year-old Gen Z creative talks differently than a 52-year-old CFO.

2. **React honestly** — Not every strategy resonates with every persona. It is EXPECTED that some personas will reject a variant entirely. Don't be artificially positive.

3. **Explain WHY** — "I wouldn't engage" is not enough. "I wouldn't engage because the tone feels corporate and patronizing, and I already get 50 emails like this from competitors" IS enough.

4. **Rewrite the message** — For each variant, show how YOU (the persona) would want to hear this message. This gives the strategist concrete direction.

5. **Name your dealbreaker** — If there's ONE thing that would make you scroll past, unsubscribe, or ignore this campaign, name it explicitly. If there's no dealbreaker, set it to null.

## Context awareness
You have access to the full critic-defense cycle. Use this to evaluate whether weaknesses identified by the critic were adequately addressed from the persona's perspective.

## Campaign Goal: "${goalLabel}"

## Scoring
For each persona, rate BOTH variants on 4 creative dimensions (1-10):
- originalityScore: Would this make me stop scrolling? Use the FULL 1-10 range.
- memorabilityScore: Would I remember this next week?
- culturalRelevanceScore: Does this feel relevant to my world right now?
- talkabilityScore: Would I share this or spark a conversation about it?
Ensure at least 3 points spread between the highest and lowest scores across the two variants.

## Output Format
Return a JSON object with:
{
  "personaDebate": [
    {
      "personaId": "...",
      "personaName": "...",
      "variantReactions": [
        { "variant": "A", "firstImpression": "...", "wouldEngage": true/false, "engagementReason": "...", "emotionalResponse": "...", "barriers": [...], "triggers": [...], "channelPreference": "...", "messageRewrite": "..." },
        { "variant": "B", ... }
      ],
      "preferredVariant": "A" or "B",
      "preferenceStrength": "strong" | "slight" | "indifferent",
      "dealbreaker": "..." or null,
      "originalityScore": 1-10,
      "memorabilityScore": 1-10,
      "culturalRelevanceScore": 1-10,
      "talkabilityScore": 1-10,
      "creativeVerdict": "one-line gut reaction"
    }
  ]
}

IMPORTANT: Respond in English. Respond with valid JSON only. No markdown, no explanation, no code blocks.`;

  const user = `## Brand Context
${params.brandContext}

## Personas to Simulate
${params.personas}

## Variant A — Revised Strategy (after critic-defense cycle)
${params.revisedStrategyA}

## Variant A — Revised Architecture
${params.revisedArchitectureA}

## Variant B — Revised Strategy (after critic-defense cycle)
${params.revisedStrategyB}

## Variant B — Revised Architecture
${params.revisedArchitectureB}

## Context: What the Critic Found
### Critique of Variant A:
${params.critiqueOfA}

### Critique of Variant B:
${params.critiqueOfB}

## Context: How the Strategists Responded
### Defense of Variant A:
${params.defenseA}

### Defense of Variant B:
${params.defenseB}

For each persona, evaluate both revised variants. React in character, score honestly, and name your dealbreaker.`;

  return { system, user };
}

// =============================================================================
// CREATIVE QUALITY DEBATE — Refocused on creative strength
// =============================================================================

interface CreativeCriticPromptParams {
  conceptJson: string;
  insightJson: string;
  brandContext: string;
  personaContext: string;
  goalType: string;
}

/**
 * Critic agent refocused on CREATIVE QUALITY — stickiness, bisociation, differentiation.
 */
export function buildCreativeCriticPrompt(params: CreativeCriticPromptParams): { system: string; user: string } {
  const goalLabel = GOAL_LABELS[params.goalType] ?? params.goalType;

  const system = `You are a creative quality auditor with 20+ years judging Cannes Lions, D&AD, and Effie Awards.

Your job: Find the CREATIVE WEAKNESSES in this concept. Be ruthlessly honest.

## Your Critical Framework

1. **Stickiness Audit (SUCCESs — Heath & Heath)**
   Re-score each criterion (1-10). The creator scored themselves — you verify:
   - Simple: Can a 10-year-old get it?
   - Unexpected: Does it genuinely violate a category norm?
   - Concrete: Can you SEE it?
   - Credible: Would a skeptical consumer believe this?
   - Emotional: Does it trigger a SPECIFIC emotion?
   - Story: Is there a character with a tension?

2. **Bisociation Strength (Koestler)**
   - Are the two frames genuinely incompatible? Or boringly adjacent?
   - Does the connection CREATE surprise? Or feel forced?
   - Is the visual world distinctive? Or could any brand claim it?

3. **Campaign Line Test**
   - Bar Test: Would a real person say this?
   - T-Shirt Test: Would someone WEAR this?
   - Opposite Test: Is the opposite interesting?
   - Category Escape: Does it work beyond this product category?

4. **Memorable Device Test**
   - Is it INHERENT to the concept? Or bolted on?
   - Could consumers PARTICIPATE? Or just witness it?
   - Is it REPLICABLE across touchpoints?

5. **Category Comparison**
   - Have you seen something SIMILAR? Name it.
   - What makes this genuinely different?

## Output Format
Return a JSON object:
{
  "stickinessAudit": {
    "simple": { "score": N, "assessment": "..." },
    "unexpected": { "score": N, "assessment": "..." },
    "concrete": { "score": N, "assessment": "..." },
    "credible": { "score": N, "assessment": "..." },
    "emotional": { "score": N, "assessment": "..." },
    "story": { "score": N, "assessment": "..." },
    "totalScore": N,
    "overallVerdict": "One-sentence stickiness judgment"
  },
  "bisociationStrength": {
    "score": N,
    "connectionQuality": "forced | adjacent | surprising | brilliant",
    "assessment": "..."
  },
  "campaignLineVerdict": {
    "barTest": { "passes": bool, "reasoning": "..." },
    "tShirtTest": { "passes": bool, "reasoning": "..." },
    "oppositeTest": { "passes": bool, "reasoning": "..." },
    "categoryEscapeTest": { "passes": bool, "reasoning": "..." },
    "overallLineScore": N
  },
  "memorableDeviceVerdict": {
    "isInherent": bool,
    "isParticipatory": bool,
    "isReplicable": bool,
    "score": N,
    "assessment": "..."
  },
  "categoryComparison": {
    "similarCampaigns": ["Campaign X by Brand Y — why similar"],
    "differentiationScore": N
  },
  "topWeaknesses": ["Top 3 creative weaknesses"],
  "topStrengths": ["Top 3 creative strengths"],
  "overallCreativeScore": N,
  "elevationSuggestions": ["3 specific creative improvements"]
}

Respond with valid JSON only.`;

  const user = `Evaluate this creative concept for a "${goalLabel}" campaign.

## The Human Insight
${params.insightJson}

## The Creative Concept
${params.conceptJson}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext}

Be ruthlessly honest.`;

  return { system, user };
}

interface CreativeDefensePromptParams {
  conceptJson: string;
  insightJson: string;
  critiqueJson: string;
  brandContext: string;
  personaContext: string;
  goalType: string;
}

/**
 * Defense agent as Creative Director — defend or improve creative choices.
 */
export function buildCreativeDefensePrompt(params: CreativeDefensePromptParams): { system: string; user: string } {
  const system = `You are the Creative Director who created this concept. A senior auditor found weaknesses.

Your job:
1. **Acknowledge valid criticism** — IMPROVE your concept where the auditor is right
2. **Defend strong choices** — Explain WHY your creative choice is brilliant if the auditor missed it
3. **Elevate** — For every weakness, provide a CONCRETE creative improvement

## Rules
- Return a COMPLETE revised concept, not patches
- NEVER abandon your core bisociation or campaign line unless fatally flawed
- REFINE and SHARPEN, don't restart
- If campaign line fails 2+ tests, propose an alternative but keep the Big Idea
- For each weakness: "accepted", "defended", or "partially_accepted"

## Output Format
Return a JSON object:
{
  "addressedWeaknesses": [{ "weakness": "...", "response": "accepted|defended|partially_accepted", "action": "..." }],
  "revisedConcept": {
    "campaignLine": "...",
    "bigIdea": "...",
    "goldenbergTemplate": "...",
    "goldenbergApplication": "...",
    "bisociationDomain": { "domain": "...", "connectionToInsight": "...", "visualPotential": "..." },
    "visualWorld": "...",
    "memorableDevice": "...",
    "stickinessScore": { "simple": N, "unexpected": N, "concrete": N, "credible": N, "emotional": N, "story": N, "total": N },
    "campaignLineTests": { "barTest": bool, "tShirtTest": bool, "parodyTest": bool, "tenYearTest": bool, "categoryEscapeTest": bool, "oppositeTest": bool },
    "creativeTerritory": "...",
    "extendability": [...]
  },
  "changeLog": ["What changed and why"],
  "confidenceScore": N
}

Respond with valid JSON only.`;

  const user = `## Your Original Concept
${params.conceptJson}

## The Original Insight
${params.insightJson}

## The Critic's Review
${params.critiqueJson}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext}

Address each weakness. Return your improved concept.`;

  return { system, user };
}
