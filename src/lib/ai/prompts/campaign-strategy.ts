// =============================================================================
// Campaign Strategy Blueprint — 7-Step AI Prompt Chain
// Academic basis: Percy & Elliott, Binet & Field (60/40), Fill's 3P,
// Christensen JTBD, Google HHH model
// =============================================================================

import type { StrategicIntent, CampaignBriefing } from '@/lib/campaigns/strategy-blueprint.types';
import { DELIVERABLE_TYPE_IDS } from '@/features/campaigns/lib/deliverable-types';

// ─── Helpers ────────────────────────────────────────────────

function intentDescription(intent: StrategicIntent): string {
  switch (intent) {
    case 'brand_building': return 'Brand Building (60% brand / 40% activation per Binet & Field IPA data)';
    case 'sales_activation': return 'Sales Activation (40% brand / 60% activation per Binet & Field IPA data)';
    case 'hybrid': return 'Hybrid (50% brand / 50% activation balanced approach)';
  }
}

function intentRatio(intent: StrategicIntent): { brand: number; activation: number } {
  switch (intent) {
    case 'brand_building': return { brand: 60, activation: 40 };
    case 'sales_activation': return { brand: 40, activation: 60 };
    case 'hybrid': return { brand: 50, activation: 50 };
  }
}

// ─── Step 1: Strategy Architect ─────────────────────────────

export function buildStrategyArchitectPrompt(params: {
  brandContext: string;
  personaContext: string;
  campaignName: string;
  campaignDescription: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  productContext: string;
  competitorContext: string;
  trendContext: string;
  briefing?: CampaignBriefing;
}): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);

  const system = `You are a senior brand strategist specializing in integrated campaign planning.

Your role: Formulate the strategic foundation for a campaign based on the brand's assets, target personas, products, and competitive landscape.

Academic frameworks you must apply:
- Percy & Elliott's campaign planning model (stimulus → processing → response)
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Christensen's Jobs-to-be-Done (JTBD) framework for audience framing

IMPORTANT: If a Creative Briefing is provided, use it as the primary strategic direction. The occasion drives urgency, the audience objective shapes messaging, the core message anchors the campaign theme, tone preferences guide creative direction, and constraints are non-negotiable boundaries.

Output requirements:
- strategicIntent: "${params.strategicIntent}"
- intentRatio: { brand: ${ratio.brand}, activation: ${ratio.activation} }
- campaignTheme: A compelling 3-7 word campaign theme
- positioningStatement: One sentence positioning statement
- messagingHierarchy: Brand message (always-on), campaign message (specific), 3-5 proof points
- jtbdFraming: Complete JTBD with "When I..., I want to..., so I can..." job statement
- strategicChoices: 3-5 conscious strategic decisions with rationale

Respond with valid JSON matching the StrategyLayer schema.`;

  // Build creative briefing section
  const briefingLines: string[] = [];
  if (params.briefing?.occasion) {
    briefingLines.push(`Occasion / Why now: ${params.briefing.occasion}`);
  }
  if (params.briefing?.audienceObjective) {
    briefingLines.push(`Audience objective (Think/Feel/Do): ${params.briefing.audienceObjective}`);
  }
  if (params.briefing?.coreMessage) {
    briefingLines.push(`Core message: ${params.briefing.coreMessage}`);
  }
  if (params.briefing?.tonePreference) {
    briefingLines.push(`Desired tone / creative direction: ${params.briefing.tonePreference}`);
  }
  if (params.briefing?.constraints) {
    briefingLines.push(`Constraints / mandatories: ${params.briefing.constraints}`);
  }

  const briefingSection = briefingLines.length > 0
    ? `\n\n## Creative Briefing\n${briefingLines.join('\n')}`
    : '';

  const user = `Create a campaign strategy for "${params.campaignName}".

## Campaign Brief
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${briefingSection}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available — create strategy based on brand positioning only.'}

## Products & Services
${params.productContext || 'No products defined yet.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined yet.'}

## Market Trends
${params.trendContext || 'No trends defined yet.'}`;

  return { system, user };
}

// ─── Step 2a: Campaign Architect A (Claude — organic/thought leadership) ────

export function buildArchitectAPrompt(params: {
  strategyLayer: string;
  personaContext: string;
  productContext: string;
  personaIds: string[];
}): { system: string; user: string } {
  const system = `You are a campaign architect specializing in organic growth and thought leadership strategies.

Your role: Design the campaign architecture — journey phases, touchpoints, and campaign type — with a FOCUS ON ORGANIC REACH AND THOUGHT LEADERSHIP.

Framework: Fill's Marketing Communications Planning Framework (MCPF) with emphasis on Pull strategies.

Requirements:
- campaignType: Choose the type that best fits the strategy and audience journey
- journeyPhases: Define as many phases as the customer journey naturally requires — do not assume a fixed number
  - Each phase needs: goal, KPIs, per-persona data (needs, pain points, mindset, triggers)
  - Each phase needs: relevant touchpoints (channel, content type, message, role, persona relevance)
- Focus on: earned media, content marketing, community, SEO, thought leadership, email nurturing
- Use persona IDs from the provided list for all personaId fields

Respond with valid JSON matching the ArchitectureLayer schema.`;

  const user = `Design campaign architecture variant A (organic/thought leadership focus).

## Campaign Strategy (Layer 1)
${params.strategyLayer}

## Target Personas
${params.personaContext || 'No personas — design for a general audience.'}
Persona IDs to use: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined yet.'}`;

  return { system, user };
}

// ─── Step 2b: Campaign Architect B (Gemini Pro — conversion/paid) ────────

export function buildArchitectBPrompt(params: {
  strategyLayer: string;
  personaContext: string;
  productContext: string;
  personaIds: string[];
}): { system: string; user: string } {
  const system = `You are a performance marketing architect specializing in conversion optimization and paid media strategies.

Your role: Design the campaign architecture — journey phases, touchpoints, and campaign type — with a FOCUS ON DIRECT CONVERSION AND PAID MEDIA.

Framework: Fill's Marketing Communications Planning Framework (MCPF) with emphasis on Push and Profile strategies.

Requirements:
- campaignType: Choose the type that best fits the strategy and audience journey
- journeyPhases: Define as many phases as the customer journey naturally requires — do not assume a fixed number
  - Each phase needs: goal, KPIs, per-persona data (needs, pain points, mindset, triggers)
  - Each phase needs: relevant touchpoints (channel, content type, message, role, persona relevance)
- Focus on: paid social, PPC, retargeting, landing pages, conversion-optimized email, direct response
- Use persona IDs from the provided list for all personaId fields

Respond with valid JSON matching the ArchitectureLayer schema.`;

  const user = `Design campaign architecture variant B (conversion/paid media focus).

## Campaign Strategy (Layer 1)
${params.strategyLayer}

## Target Personas
${params.personaContext || 'No personas — design for a general audience.'}
Persona IDs to use: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined yet.'}`;

  return { system, user };
}

// ─── Step 3: Persona Validator ──────────────────────────────

export function buildPersonaValidatorPrompt(params: {
  strategyLayer: string;
  variantA: string;
  variantB: string;
  personas: Array<{ id: string; name: string; profile: string }>;
}): { system: string; user: string } {
  const system = `You are simulating target personas evaluating two campaign strategy variants.

Your role: For EACH persona, roleplay as that person and evaluate both variant A (organic/thought leadership) and variant B (conversion/paid media).

Evaluation criteria per persona:
- overallScore: 1-10 (how well does this strategy resonate with this persona?)
- feedback: 2-3 sentences as the persona would naturally speak
- resonates: What elements genuinely appeal to this persona?
- concerns: What worries or doubts does this persona have?
- suggestions: What would this persona change?
- preferredVariant: "A" or "B" — which variant does this persona prefer?

Stay in character. Use the persona's vocabulary, concerns, and decision-making style.
Consider their goals, pain points, preferred channels, and buying triggers.

Respond with a JSON array of persona validation objects.`;

  const personaProfiles = params.personas.map(p =>
    `### ${p.name} (ID: ${p.id})\n${p.profile}`
  ).join('\n\n');

  const user = `Evaluate these two campaign variants as each persona.

## Campaign Strategy (Layer 1)
${params.strategyLayer}

## Variant A — Organic/Thought Leadership
${params.variantA}

## Variant B — Conversion/Paid Media
${params.variantB}

## Personas to Simulate
${personaProfiles}`;

  return { system, user };
}

// ─── Step 4: Strategy Synthesizer (Claude Opus) ─────────────

export function buildStrategySynthesizerPrompt(params: {
  strategyLayer: string;
  variantA: string;
  variantB: string;
  personaValidation: string;
  variantAScore: number;
  variantBScore: number;
}): { system: string; user: string } {
  const system = `You are a chief strategy officer performing the final synthesis of a campaign blueprint.

Your task: Combine the BEST elements from variant A (organic) and variant B (paid/conversion) into ONE optimal campaign architecture, informed by persona feedback.

Synthesis rules:
1. Select the strongest journey phases from either variant
2. Merge touchpoints where they complement each other
3. Address ALL persona concerns raised in the validation
4. Maintain strategic coherence — the final architecture must tell one story
5. Keep the campaign type that best serves the strategic intent
6. Ensure every persona's preferred elements are represented

You must also refine the original strategy layer based on persona feedback:
- Adjust messaging hierarchy if personas identified gaps
- Strengthen proof points where personas were skeptical
- Refine JTBD if personas revealed unaddressed jobs

Output a complete combined result with TWO top-level keys:
- "strategy": The refined StrategyLayer (same schema as input, with improvements)
- "architecture": The synthesized ArchitectureLayer (best of A+B)

CRITICAL JSON SCHEMA — the architecture object MUST use these EXACT field names:

architecture: {
  campaignType: string,
  journeyPhases: [
    {
      id: string,           // lowercase slug, no spaces
      name: string,          // display name for the phase
      description: string,   // Brief description of the phase
      orderIndex: number,    // 0-based position
      goal: string,          // What to achieve in this phase
      kpis: string[],
      personaPhaseData: [    // One entry per persona — REQUIRED
        {
          personaId: string,
          personaName: string,
          needs: string[],
          painPoints: string[],
          mindset: string,
          keyQuestion: string,
          triggers: string[]
        }
      ],
      touchpoints: [
        {
          channel: string,
          contentType: string,
          message: string,
          role: "primary" | "supporting",
          personaRelevance: [  // MUST be an ARRAY of objects, NOT a flat object
            {
              personaId: string,
              relevance: "high" | "medium" | "low",
              messagingAngle: string
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT:
- Use "name" (NOT "phase") for the journey phase display name
- Use "id" for the phase identifier (lowercase slug)
- personaRelevance MUST be an ARRAY of objects, NOT a flat object
- personaPhaseData MUST be included — one entry per persona from the input
- Every persona from the input MUST appear in EVERY phase's personaPhaseData

Respond with valid JSON.`;

  const user = `Synthesize the optimal campaign blueprint.

Variant A average persona score: ${params.variantAScore.toFixed(1)}/10
Variant B average persona score: ${params.variantBScore.toFixed(1)}/10

## Original Strategy (Layer 1)
${params.strategyLayer}

## Variant A — Organic/Thought Leadership
${params.variantA}

## Variant B — Conversion/Paid Media
${params.variantB}

## Persona Validation Results
${params.personaValidation}`;

  return { system, user };
}

// ─── Step 5: Channel Planner (Gemini Flash) ────────────────

export function buildChannelPlannerPrompt(params: {
  synthesizedStrategy: string;
  synthesizedArchitecture: string;
  personaChannelPrefs: string;
}): { system: string; user: string } {
  const system = `You are a media strategist creating a channel and media plan.

Framework: Google's Hero-Hub-Hygiene (HHH) model for channel role assignment.

Requirements:
- channels: 4-8 channels with role (hero/hub/hygiene), objective, target personas, content mix
- Each channel needs: frequency per content type, which journey phase it serves
- budgetAllocation: high/medium/low relative priority
- priority: 1 = highest priority channel
- timingStrategy: One sentence describing the overall timing approach
- phaseDurations: Suggested duration in weeks per journey phase

Consider persona channel preferences when prioritizing channels.

Respond with valid JSON matching the ChannelPlanLayer schema.`;

  const user = `Create the channel and media plan.

## Synthesized Strategy
${params.synthesizedStrategy}

## Campaign Architecture
${params.synthesizedArchitecture}

## Persona Channel Preferences
${params.personaChannelPrefs || 'No specific channel preferences available.'}`;

  return { system, user };
}

// ─── Step 6: Asset Planner (Gemini Flash) ──────────────────

export function buildAssetPlannerPrompt(params: {
  synthesizedStrategy: string;
  synthesizedArchitecture: string;
  channelPlan: string;
  productContext: string;
  styleguideContext: string;
}): { system: string; user: string } {
  const validTypes = DELIVERABLE_TYPE_IDS.join(', ');

  const system = `You are a content strategist creating a deliverable plan for a campaign.

Your role: Based on the campaign strategy, architecture, and channel plan, define the specific content pieces (deliverables) that need to be produced.

Requirements per deliverable:
- title: Descriptive title (e.g., "LinkedIn Thought Leadership Article — AI in Brand Strategy")
- contentType: MUST be one of these valid IDs: ${validTypes}
- channel: Which channel this goes on
- phase: Which journey phase this serves
- targetPersonas: Which persona IDs this targets
- brief: Structured content brief with objective, key message, tone direction, CTA, and 3-5 bullet content outline
- productionPriority: "must-have" (core deliverables), "should-have" (enhances campaign), "nice-to-have" (stretch goals)
- estimatedEffort: "low" (< 2 hours), "medium" (2-8 hours), "high" (> 8 hours)

IMPORTANT: The contentType field MUST exactly match one of the valid IDs listed above. Do NOT invent new content types. Choose the closest matching type from the list.

Also provide:
- totalDeliverables: Count of all deliverables
- prioritySummary: One sentence describing what to produce first and why

Produce 8-15 deliverables that form a coherent content ecosystem covering awareness, consideration, conversion, and retention stages.

Respond with valid JSON matching the AssetPlanLayer schema.`;

  const user = `Create the deliverable plan.

## Campaign Strategy
${params.synthesizedStrategy}

## Campaign Architecture
${params.synthesizedArchitecture}

## Channel Plan
${params.channelPlan}

## Products & Services
${params.productContext || 'No products defined.'}

## Brand Style Guide
${params.styleguideContext || 'No style guide available — use professional, clean tone.'}`;

  return { system, user };
}
