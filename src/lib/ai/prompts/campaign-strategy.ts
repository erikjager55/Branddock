// =============================================================================
// Campaign Strategy Blueprint — 7-Step AI Prompt Chain
// Academic basis: Percy & Elliott, Binet & Field (60/40), Fill's 3P,
// Christensen JTBD, Google HHH model
// =============================================================================

import type { StrategicIntent, CampaignBriefing } from '@/lib/campaigns/strategy-blueprint.types';
import { DELIVERABLE_TYPE_IDS } from '@/features/campaigns/lib/deliverable-types';
import { GOAL_LABELS, getGoalTypeGuidance, getGoalTypeStrategicInsights } from '@/features/campaigns/lib/goal-types';

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

// ─── Step 1a: Full Variant A (Claude — organic/thought leadership) ────────

/** Shared campaign brief section builder */
function buildBriefingSection(briefing?: CampaignBriefing): string {
  const briefingLines: string[] = [];
  if (briefing?.occasion) briefingLines.push(`Occasion / Why now: ${briefing.occasion}`);
  if (briefing?.audienceObjective) briefingLines.push(`Audience objective (Think/Feel/Do): ${briefing.audienceObjective}`);
  if (briefing?.coreMessage) briefingLines.push(`Core message: ${briefing.coreMessage}`);
  if (briefing?.tonePreference) briefingLines.push(`Desired tone / creative direction: ${briefing.tonePreference}`);
  if (briefing?.constraints) briefingLines.push(`Constraints / mandatories: ${briefing.constraints}`);
  return briefingLines.length > 0 ? `\n\n## Creative Briefing\n${briefingLines.join('\n')}` : '';
}

/**
 * Builds a structured markdown prompt section from GoalTypeStrategicInsights data.
 * Returns empty string if no insights are available for the given goal type.
 */
export function buildGoalInsightsPromptSection(goalType: string): string {
  const insights = getGoalTypeStrategicInsights(goalType);
  if (!insights) return '';

  const kpiLines = insights.recommendedKPIs
    .map(kpi => `- ${kpi.name}: ${kpi.description}${kpi.benchmark ? ` (benchmark: ${kpi.benchmark})` : ''}`)
    .join('\n');

  const pitfallLines = insights.pitfalls
    .map(p => `- AVOID: ${p}`)
    .join('\n');

  const primaryChannels = insights.channelEmphasis.primary.join(', ');
  const secondaryChannels = insights.channelEmphasis.secondary.join(', ');
  const avoidChannels = insights.channelEmphasis.avoid.join(', ');

  const formatLines = insights.contentFormats
    .map(f => `- ${f.format} [${f.priority}]: ${f.rationale}`)
    .join('\n');

  const { awareness, consideration, conversion, retention } = insights.funnelEmphasis;

  return `

## Strategic Framework for ${insights.label} Campaigns

### Recommended KPIs
${kpiLines}

### Strategic Pitfalls to Avoid
${pitfallLines}

### Channel Emphasis
Primary: ${primaryChannels}
Secondary: ${secondaryChannels}
Channels to avoid for this goal: ${avoidChannels}

### Content Format Priorities
${formatLines}

### Timing Considerations
${insights.timingConsiderations}

### Funnel Allocation
Awareness ${awareness}% / Consideration ${consideration}% / Conversion ${conversion}% / Retention ${retention}%`;
}

interface FullVariantPromptParams {
  brandContext: string;
  personaContext: string;
  campaignName: string;
  campaignDescription: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  productContext: string;
  competitorContext: string;
  trendContext: string;
  personaIds: string[];
  briefing?: CampaignBriefing;
  /** Are.na associative context (cultural/strategic inspiration) */
  arenaContext?: string;
}

export function buildFullVariantAPrompt(params: FullVariantPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}\nAdapt strategy and channel selection to this specific goal type.`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a senior brand strategist specializing in organic growth and thought leadership campaigns.

Your role: Generate BOTH the strategic foundation AND the campaign architecture in a single response, with a FOCUS ON ORGANIC REACH AND THOUGHT LEADERSHIP.

Academic frameworks to apply:
- Percy & Elliott's campaign planning model (stimulus → processing → response)
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Christensen's Jobs-to-be-Done (JTBD) framework for audience framing
- Fill's Marketing Communications Planning Framework (MCPF) with emphasis on Pull strategies${goalContext}${goalInsights}

IMPORTANT: If a Creative Briefing is provided, use it as the primary strategic direction.

Output a JSON object with TWO top-level keys:

"strategy": {
  strategicIntent: "${params.strategicIntent}",
  intentRatio: { brand: ${ratio.brand}, activation: ${ratio.activation} },
  campaignTheme: A compelling 3-7 word campaign theme,
  positioningStatement: One sentence positioning statement,
  messagingHierarchy: { brandMessage, campaignMessage, proofPoints (3-5) },
  jtbdFraming: { jobStatement ("When I..., I want to..., so I can..."), functionalJob, emotionalJob, socialJob },
  strategicChoices: Array of { choice, rationale, tradeoff } (3-5 items)
}

"architecture": {
  campaignType: Choose the type that best fits,
  journeyPhases: Array of phases, each with:
    id, name, description, orderIndex, goal, kpis,
    personaPhaseData: [{ personaId, personaName, needs, painPoints, mindset, keyQuestion, triggers }],
    touchpoints: [{ channel, contentType, message, role ("primary"|"supporting"),
      personaRelevance: [{ personaId, relevance ("high"|"medium"|"low"), messagingAngle }] }]
}

Focus on: earned media, content marketing, community, SEO, thought leadership, email nurturing.
Use persona IDs from the provided list for all personaId fields.

Respond with valid JSON.`;

  const user = `Generate the complete strategy + architecture for variant A (organic/thought leadership focus) for "${params.campaignName}".

## Campaign Brief
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${GOAL_LABELS[params.goalType] ?? params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available — create strategy based on brand positioning only.'}
Persona IDs to use: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined yet.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined yet.'}

## Market Trends
${params.trendContext || 'No trends defined yet.'}${params.arenaContext ? `

## Associative Inspiration (Are.na)
The following curated cultural and strategic references were found on Are.na, a knowledge platform used by creatives and strategists. Use these as associative inspiration — they may spark unexpected angles, metaphors, or positioning ideas. Do not copy them literally, but let them inform your creative thinking.

${params.arenaContext}` : ''}`;

  return { system, user };
}

// ─── Step 1b: Full Variant B (Gemini — conversion/paid media) ────────

export function buildFullVariantBPrompt(params: FullVariantPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}\nAdapt strategy and channel selection to this specific goal type.`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a performance marketing strategist specializing in conversion optimization and paid media campaigns.

Your role: Generate BOTH the strategic foundation AND the campaign architecture in a single response, with a FOCUS ON DIRECT CONVERSION AND PAID MEDIA.

Academic frameworks to apply:
- Percy & Elliott's campaign planning model (stimulus → processing → response)
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Christensen's Jobs-to-be-Done (JTBD) framework for audience framing
- Fill's Marketing Communications Planning Framework (MCPF) with emphasis on Push and Profile strategies${goalContext}${goalInsights}

IMPORTANT: If a Creative Briefing is provided, use it as the primary strategic direction.

Output a JSON object with TWO top-level keys:

"strategy": {
  strategicIntent: "${params.strategicIntent}",
  intentRatio: { brand: ${ratio.brand}, activation: ${ratio.activation} },
  campaignTheme: A compelling 3-7 word campaign theme,
  positioningStatement: One sentence positioning statement,
  messagingHierarchy: { brandMessage, campaignMessage, proofPoints (3-5) },
  jtbdFraming: { jobStatement ("When I..., I want to..., so I can..."), functionalJob, emotionalJob, socialJob },
  strategicChoices: Array of { choice, rationale, tradeoff } (3-5 items)
}

"architecture": {
  campaignType: Choose the type that best fits,
  journeyPhases: Array of phases, each with:
    id, name, description, orderIndex, goal, kpis,
    personaPhaseData: [{ personaId, personaName, needs, painPoints, mindset, keyQuestion, triggers }],
    touchpoints: [{ channel, contentType, message, role ("primary"|"supporting"),
      personaRelevance: [{ personaId, relevance ("high"|"medium"|"low"), messagingAngle }] }]
}

Focus on: paid social, PPC, retargeting, landing pages, conversion-optimized email, direct response.
Use persona IDs from the provided list for all personaId fields.

Respond with valid JSON.`;

  const user = `Generate the complete strategy + architecture for variant B (conversion/paid media focus) for "${params.campaignName}".

## Campaign Brief
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${GOAL_LABELS[params.goalType] ?? params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available — create strategy based on brand positioning only.'}
Persona IDs to use: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined yet.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined yet.'}

## Market Trends
${params.trendContext || 'No trends defined yet.'}${params.arenaContext ? `

## Associative Inspiration (Are.na)
The following curated cultural and strategic references were found on Are.na, a knowledge platform used by creatives and strategists. Use these as associative inspiration — they may spark unexpected angles, metaphors, or positioning ideas. Do not copy them literally, but let them inform your creative thinking.

${params.arenaContext}` : ''}`;

  return { system, user };
}

// ─── Step 2: Persona Validator ──────────────────────────────

export function buildPersonaValidatorPrompt(params: {
  strategyLayerA: string;
  strategyLayerB: string;
  variantA: string;
  variantB: string;
  personas: Array<{ id: string; name: string; profile: string }>;
  goalType?: string;
  goalGuidance?: string;
}): { system: string; user: string } {
  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${params.goalGuidance}\nEvaluate how well each variant serves this specific goal type from each persona's perspective.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are simulating target personas evaluating two complete campaign strategy variants.

Your role: For EACH persona, roleplay as that person and evaluate both variant A (organic/thought leadership) and variant B (conversion/paid media). Each variant has its OWN strategic foundation AND campaign architecture.${goalContext}${goalInsights}

Evaluation criteria per persona — ALL fields are MANDATORY:
- overallScore: Score 1-10. Be honest and critical — avoid giving every persona the same score. Differentiate based on how well the strategy truly fits each persona's unique situation.
- feedback: MANDATORY: Write 2-3 specific sentences as the persona would naturally speak. Reference specific elements from the variants. NEVER leave empty or vague.
- resonates: MANDATORY: List at least 1 specific element that genuinely appeals to this persona. Be concrete — reference specific channels, messages, or touchpoints.
- concerns: MANDATORY: List at least 1 specific concern or doubt this persona would have. Every strategy has weaknesses from some perspective.
- suggestions: MANDATORY: List at least 1 actionable suggestion this persona would make to improve the strategy.
- preferredVariant: "A" or "B" — which variant does this persona prefer?

Stay in character. Use the persona's vocabulary, concerns, and decision-making style.
Consider their goals, pain points, preferred channels, and buying triggers.

Respond with a JSON array of persona validation objects.`;

  const personaProfiles = params.personas.map(p =>
    `### ${p.name} (ID: ${p.id})\n${p.profile}`
  ).join('\n\n');

  const user = `Evaluate these two complete campaign variants as each persona.

## Variant A — Organic/Thought Leadership

### Strategy A
${params.strategyLayerA}

### Architecture A
${params.variantA}

## Variant B — Conversion/Paid Media

### Strategy B
${params.strategyLayerB}

### Architecture B
${params.variantB}

## Personas to Simulate
${personaProfiles}`;

  return { system, user };
}

// ─── Step 4: Strategy Synthesizer (Claude Opus) ─────────────

export function buildStrategySynthesizerPrompt(params: {
  strategyLayerA: string;
  strategyLayerB: string;
  variantA: string;
  variantB: string;
  personaValidation: string;
  variantAScore: number;
  variantBScore: number;
  goalType?: string;
  goalGuidance?: string;
}): { system: string; user: string } {
  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal: "${GOAL_LABELS[params.goalType] ?? params.goalType}". ${params.goalGuidance}\nEnsure the synthesized blueprint optimally serves this goal type.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are a chief strategy officer performing the final synthesis of a campaign blueprint.

Your task: Combine the BEST elements from variant A (organic) and variant B (paid/conversion) into ONE optimal campaign architecture, informed by persona feedback.${goalContext}${goalInsights}

Synthesis rules:
1. Select the strongest journey phases from either variant
2. Merge touchpoints where they complement each other
3. Address ALL persona concerns raised in the validation
4. Maintain strategic coherence — the final architecture must tell one story
5. Keep the campaign type that best serves the strategic intent
6. Ensure every persona's preferred elements are represented

Each variant has its OWN strategy AND architecture. You must synthesize the best elements from both strategies AND both architectures:
- Pick the strongest campaign theme and positioning from either variant
- Merge messaging hierarchies where they complement each other
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

## Variant A — Organic/Thought Leadership

### Strategy A
${params.strategyLayerA}

### Architecture A
${params.variantA}

## Variant B — Conversion/Paid Media

### Strategy B
${params.strategyLayerB}

### Architecture B
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
  goalType?: string;
  goalGuidance?: string;
}): { system: string; user: string } {
  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal: "${GOAL_LABELS[params.goalType] ?? params.goalType}". ${params.goalGuidance}\nPrioritize channels that best serve this goal type.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are a media strategist creating a channel and media plan.

Framework: Google's Hero-Hub-Hygiene (HHH) model for channel role assignment.${goalContext}${goalInsights}

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
  goalType?: string;
  goalGuidance?: string;
}): { system: string; user: string } {
  const validTypes = DELIVERABLE_TYPE_IDS.join(', ');

  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal: "${GOAL_LABELS[params.goalType] ?? params.goalType}". ${params.goalGuidance}\nSelect deliverable types that are most relevant for this goal type.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are a content strategist creating a deliverable plan for a campaign.

Your role: Based on the campaign strategy, architecture, and channel plan, define the specific content pieces (deliverables) that need to be produced.${goalContext}${goalInsights}

Requirements per deliverable:
- title: Descriptive title (e.g., "LinkedIn Thought Leadership Article — AI in Brand Strategy")
- contentType: MUST be one of these valid IDs: ${validTypes}
- channel: Which channel this goes on
- phase: Which journey phase this serves
- targetPersonas: Which persona IDs this targets
- brief: Structured content brief with objective, key message, tone direction, CTA, and 3-5 bullet content outline
- productionPriority: "must-have" (core deliverables), "should-have" (enhances campaign), "nice-to-have" (stretch goals)
- estimatedEffort: "low" (< 2 hours), "medium" (2-8 hours), "high" (> 8 hours)
- suggestedOrder: number (1-based deployment order within this phase — 1 goes out first, 2 second, etc. Consider channel variety and persona rotation when ordering. Avoid scheduling two deliverables for the same channel back-to-back.)

IMPORTANT: The contentType field MUST exactly match one of the valid IDs listed above. Do NOT invent new content types. Choose the closest matching type from the list.

Also provide:
- totalDeliverables: Count of all deliverables
- prioritySummary: One sentence describing what to produce first and why
- flowConnections: An array of 5-15 objects describing how deliverables connect in the customer journey content flow. Each connection links two deliverables by their EXACT title. Connection types:
  - "sequence": Direct flow — one deliverable leads to the next (e.g. ad → landing page → email follow-up)
  - "amplifies": One deliverable reinforces another (e.g. social post amplifies a blog article)
  - "retargets": Follow-up for non-converters (e.g. retargeting ad for people who visited landing page but didn't convert)
  Rules for flowConnections:
  - fromTitle and toTitle MUST exactly match a deliverable title from your deliverables array
  - Every must-have deliverable should participate in at least one connection
  - Do NOT create circular chains (A→B→C→A)
  - Include a short "label" describing the relationship (e.g. "drives traffic to", "nurtures leads", "re-engages visitors")
- prepDeliverables: An array of 2-5 preparation items that MUST be completed BEFORE the campaign launches (Week 0). These are NOT content pieces — they are internal setup, alignment, and planning documents. Each prep deliverable has:
  - title: Clear action-oriented title (e.g. "Define Brand Voice Guidelines for Campaign")
  - description: 1-2 sentences describing what needs to be prepared and why
  - category: One of "campaign-brief", "brand-guidelines", "content-calendar", "audience-brief", "asset-checklist", "channel-setup", "stakeholder-alignment"
  - owner: Role responsible (e.g. "Brand Manager", "Content Lead", "Strategy Team", "Design Lead")
  - estimatedEffort: "low" (< 2h), "medium" (2-8h), "high" (> 8h)
  Typical prep deliverables include: campaign brief finalization, brand/tone guidelines, content calendar setup, audience segment definitions, channel account setup, stakeholder alignment docs, asset templates, and approval workflows.

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
