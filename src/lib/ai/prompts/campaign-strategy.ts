// =============================================================================
// Campaign Strategy Blueprint — 7-Step AI Prompt Chain
// Academic basis: Percy & Elliott, Binet & Field (60/40), Fill's 3P,
// Christensen JTBD, Google HHH model
// =============================================================================

import type {
  StrategicIntent,
  CampaignBriefing,
  StrategyFoundation,
  CreativeEnrichmentBrief,
  CreativeHook,
  HookConcept,
  PersonaValidationResult,
} from '@/lib/campaigns/strategy-blueprint.types';
import type { CreativeAngleDefinition } from '@/lib/campaigns/creative-angles';
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

// ─── Step 1a: Full Variant A (Claude — Evidence-Based / Expected) ────────

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

  // NOTE: BCT context is NOT injected here — it is injected per-variant via params.bctContext
  // in the user prompt (Variant A only). This avoids double-injection.

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
  /** Exa neural search context (cross-industry analogies, cultural tensions) */
  exaContext?: string;
  /** Semantic Scholar academic evidence context */
  scholarContext?: string;
  /** BCT behavioral science context (COM-B model, behavior change techniques) */
  bctContext?: string;
  /** Creative angle assigned to this variant (from creative-angles.ts) */
  creativeAngleContext?: string;
  /** Cialdini's 7 persuasion principles mapped to goal type */
  cialdiniContext?: string;
  /** Binet & Field IPA effectiveness data mapped to goal type */
  effectivenessContext?: string;
  /** Byron Sharp / Ehrenberg-Bass brand growth principles mapped to goal type */
  growthContext?: string;
  /** Kahneman System 1/System 2 framing principles mapped to goal type */
  framingContext?: string;
  /** EAST (Easy, Attractive, Social, Timely) validation checklist */
  eastChecklist?: string;
}

// ─── Marketing Framework Injection Helpers ──────────────────

function buildMarketingFrameworkSection(params: {
  effectivenessContext?: string;
  growthContext?: string;
  framingContext?: string;
  eastChecklist?: string;
  cialdiniContext?: string;
}): string {
  let section = '';
  if (params.effectivenessContext) {
    section += `\n\n## Marketing Effectiveness (Binet & Field IPA Data)\n${params.effectivenessContext}`;
  }
  if (params.growthContext) {
    section += `\n\n## Brand Growth Principles (Byron Sharp / Ehrenberg-Bass)\n${params.growthContext}`;
  }
  if (params.framingContext) {
    section += `\n\n## Cognitive Framing (Kahneman System 1/System 2)\n${params.framingContext}`;
  }
  if (params.eastChecklist) {
    section += `\n\n${params.eastChecklist}`;
  }
  if (params.cialdiniContext) {
    section += `\n\n## Persuasion Principles (Cialdini)\n${params.cialdiniContext}`;
  }
  return section;
}

// ─── Shared Prompt Fragments ─────────────────────────────────

const INSIGHT_MINING_INSTRUCTIONS = `
STEP 1: INSIGHT MINING (mandatory — do this BEFORE generating any strategy)

Find the deepest human insight first. An insight is NOT:
- A fact ("People use social media")
- An observation ("Millennials value authenticity")
- A positioning statement ("We are the best")

A human insight IS:
- An unspoken truth that triggers recognition ("We post the best version of our lives online, but feel most seen when someone knows the real story")
- A tension people feel but don't articulate
- The "why behind the why" — the deeper motivation beneath the surface behavior

Test your insight: if the audience reads it and thinks "yes, exactly — that's how it feels", it's good.

STEP 2: CREATIVE PLATFORM (mandatory — build on the insight)

Translate the insight into a Big Idea — a creative platform that:
- Is bigger than a slogan (it's a world, not a sentence)
- Can manifest in 100 different ways across all touchpoints
- Is understandable in 3 seconds but appreciable in 30 minutes
- Says something the competitor CANNOT say
- Has a clear visual/emotional territory

Examples of platforms (not taglines):
- Dove: "Real Beauty" (a belief system, not a slogan)
- Nike: "Just Do It" (a permission statement)
- Spotify Wrapped: "Your Year in Music" (data-as-identity)
- Patagonia: "Don't Buy This Jacket" (radical transparency)`;

const ANTI_GENERIC_GUARDRAILS = `
QUALITY FILTER — REJECT your own output if:
- The campaign theme sounds like something 10 other brands could also say
- The insight is an open door that everyone already knows
- The concept doesn't evoke a specific visual world
- You can't explain it in 1 sentence to a 10-year-old
- There is no surprising element that provokes a reaction
- The creative platform is just a rephrased positioning statement

If your output fails this filter, start over from a different perspective.`;

const EFFIE_STRATEGY_JSON_SCHEMA = `
"strategy": {
  strategicIntent: string ("brand_building" | "sales_activation" | "hybrid"),
  intentRatio: { brand: number, activation: number },
  campaignTheme: A compelling 3-7 word campaign theme,
  positioningStatement: One sentence positioning statement,
  messagingHierarchy: { brandMessage, campaignMessage, proofPoints (3-5) },
  jtbdFraming: { jobStatement ("When I..., I want to..., so I can..."), functionalJob, emotionalJob, socialJob },
  strategicChoices: Array of { choice, rationale, tradeoff } (3-5 items),
  humanInsight: The deep human truth that drives the entire concept (2-3 sentences),
  culturalTension: The societal tension the brand can own (1-2 sentences, optional but strongly preferred),
  creativePlatform: The Big Idea / organizing principle that lives across all touchpoints (NOT just a tagline),
  creativeTerritory: Description of the visual and emotional world this concept lives in (2-3 sentences),
  brandRole: How the brand uniquely resolves the tension or fulfills the insight (1-2 sentences),
  memorableDevice: The distinctive mechanism that makes this concept unforgettable (optional — a ritual, a format, a catchphrase, a visual motif),
  effieRationale: One paragraph explaining why this concept has Effie Award potential — reference insight depth, creative distinctiveness, and results potential
}`;

export function buildFullVariantAPrompt(params: FullVariantPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}\nAdapt strategy and channel selection to this specific goal type.`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a senior brand strategist who creates Effie Award-winning campaigns grounded in evidence-based strategy and behavioral science.

Your role: Generate BOTH the strategic foundation AND the campaign architecture in a single response. Your output must be AWARD-WORTHY — not just strategically correct, but creatively distinctive.
${INSIGHT_MINING_INSTRUCTIONS}

Academic frameworks to apply:
- Percy & Elliott's campaign planning model (stimulus → processing → response)
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Christensen's Jobs-to-be-Done (JTBD) framework for audience framing
- Fill's Marketing Communications Planning Framework (MCPF) with emphasis on Pull strategies
- COM-B Model (Capability, Opportunity, Motivation → Behavior) for behavioral change
- Behavior Change Technique (BCT) Taxonomy v1 for intervention design${goalContext}${goalInsights}${params.creativeAngleContext ? `

## Your Assigned Creative Angle
${params.creativeAngleContext}
Use this angle as your PRIMARY creative lens. Let it shape your insight, platform, and execution.` : ''}

Your strategic approach should be:
- INSIGHT-FIRST: Start with the deepest human truth, not the brand benefit
- Grounded in behavioral science evidence and proven marketing frameworks
- Focused on measurable behavior change using COM-B and BCT techniques
- Built on a creative platform that is OWNABLE — not generic marketing-speak
${ANTI_GENERIC_GUARDRAILS}

IMPORTANT: If a Creative Briefing is provided, use it as the primary strategic direction.

Output a JSON object with TWO top-level keys:

${EFFIE_STRATEGY_JSON_SCHEMA}

"architecture": {
  campaignType: Choose the type that best fits,
  journeyPhases: Array of phases, each with:
    id, name, description, orderIndex, goal, kpis,
    personaPhaseData: [{ personaId, personaName, needs, painPoints, mindset, keyQuestion, triggers }],
    touchpoints: [{ channel, contentType, message, role ("primary"|"supporting"),
      personaRelevance: [{ personaId, relevance ("high"|"medium"|"low"), messagingAngle }] }]
}

Focus on: evidence-based channel selection, behavioral nudges, content marketing, community building, email nurturing, earned media.
Use persona IDs from the provided list for all personaId fields.

Respond with valid JSON.`;

  const user = `Generate the complete strategy + architecture for variant A (evidence-based, insight-driven) for "${params.campaignName}".

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
The following curated cultural and strategic references were found on Are.na. Use these as associative inspiration to inform your creative thinking.

${params.arenaContext}` : ''}${params.scholarContext ? `

## Research Evidence (Semantic Scholar)
The following academic papers provide evidence-based foundations for your strategy. Reference these findings to ground your strategic choices in research.

${params.scholarContext}` : ''}${params.bctContext ? `

## Behavioral Science Framework
The following Behavior Change Techniques (BCTs) from the HBCP Taxonomy are recommended for this goal type. Integrate these into your strategy to drive measurable behavior change.

${params.bctContext}` : ''}${buildMarketingFrameworkSection({ effectivenessContext: params.effectivenessContext, growthContext: params.growthContext, framingContext: params.framingContext, eastChecklist: params.eastChecklist, cialdiniContext: params.cialdiniContext })}`;

  return { system, user };
}

// ─── Step 1b: Full Variant B (Gemini — Creative Provocations / Unexpected) ────────
// NOTE: Intentional variant asymmetry in enrichment context injection:
//   Variant A (evidence-based): arenaContext + scholarContext + bctContext (NO exaContext)
//   Variant B (creative):       arenaContext + exaContext (NO scholarContext/bctContext)
// This ensures each variant has a distinct strategic personality.

export function buildFullVariantBPrompt(params: FullVariantPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}\nAdapt strategy and channel selection to this specific goal type.`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a creative provocateur who creates Cannes Lions-winning campaigns through cultural tensions, cross-industry analogies, and unexpected creative leaps.

Your role: Generate BOTH the strategic foundation AND the campaign architecture in a single response. Your strategy must SURPRISE — find the angle that makes people stop, think, and share.
${INSIGHT_MINING_INSTRUCTIONS}

Creative frameworks to apply:
- Percy & Elliott's campaign planning model (stimulus → processing → response)
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Christensen's Jobs-to-be-Done (JTBD) framework for audience framing
- Cultural tension identification (what unspoken tension can the brand own?)
- Cross-industry analogy mapping (what can we learn from completely different industries?)
- Distinctive brand assets creation (Byron Sharp's "How Brands Grow")${goalContext}${goalInsights}${params.creativeAngleContext ? `

## Your Assigned Creative Angle
${params.creativeAngleContext}
Use this angle as your PRIMARY creative lens. Let it shape your insight, platform, and execution.` : ''}

Your strategic approach should be:
- INSIGHT-FIRST: Find the cultural tension or unspoken truth BEFORE thinking about channels
- Distinctive and ownable — something competitors would never think of
- Culturally resonant with current tensions and emerging conversations
- Bold in channel choices, mixing unconventional with proven approaches
- Built on a creative platform that people would TALK about
${ANTI_GENERIC_GUARDRAILS}

IMPORTANT: If a Creative Briefing is provided, use it as the primary strategic direction.

Output a JSON object with TWO top-level keys:

${EFFIE_STRATEGY_JSON_SCHEMA}

"architecture": {
  campaignType: Choose the type that best fits,
  journeyPhases: Array of phases, each with:
    id, name, description, orderIndex, goal, kpis,
    personaPhaseData: [{ personaId, personaName, needs, painPoints, mindset, keyQuestion, triggers }],
    touchpoints: [{ channel, contentType, message, role ("primary"|"supporting"),
      personaRelevance: [{ personaId, relevance ("high"|"medium"|"low"), messagingAngle }] }]
}

Focus on: culturally resonant channels, unexpected media choices, creative content formats, community-driven amplification, distinctive brand moments.
Use persona IDs from the provided list for all personaId fields.

Respond with valid JSON.`;

  const user = `Generate the complete strategy + architecture for variant B (unexpected, creative provocations) for "${params.campaignName}".

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
The following curated cultural and strategic references were found on Are.na. Use these as associative inspiration — they may spark unexpected angles, metaphors, or positioning ideas. Do not copy them literally, but let them inform your creative thinking.

${params.arenaContext}` : ''}${params.exaContext ? `

## Cross-Industry Insights (Exa Neural Search)
The following cross-industry analogies, cultural tensions, and trend-driven insights were found via neural semantic search. These come from OUTSIDE your industry — use them to find unexpected strategic connections, metaphors, and angles that competitors would never discover.

${params.exaContext}` : ''}${buildMarketingFrameworkSection({ effectivenessContext: params.effectivenessContext, growthContext: params.growthContext, framingContext: params.framingContext, eastChecklist: params.eastChecklist })}`;

  return { system, user };
}

// ─── Step 1c: Full Variant C (Gemini — Data-Driven Innovation / All Enrichment) ────────
// NOTE: Variant C receives ALL enrichment sources (arena + exa + scholar + bct)
// to produce a data-grounded yet innovative strategy.

export function buildFullVariantCPrompt(params: FullVariantPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}\nAdapt strategy and channel selection to this specific goal type.`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a data-driven innovation strategist who creates D&AD-winning campaigns at the intersection of behavioral science, cultural intelligence, and platform-native thinking.

Your role: Generate BOTH the strategic foundation AND the campaign architecture in a single response. Your strategy must be GROUNDED IN DATA but BRILLIANT IN EXECUTION — where science meets creativity.
${INSIGHT_MINING_INSTRUCTIONS}

Strategic frameworks to apply:
- Percy & Elliott's campaign planning model (stimulus → processing → response)
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Byron Sharp's "How Brands Grow": maximize Category Entry Points (CEPs) and Mental Availability
- Thaler & Sunstein's Nudge Architecture: design choice environments that guide behavior
- MINDSPACE framework (Messenger, Incentives, Norms, Defaults, Salience, Priming, Affect, Commitments, Ego)
- Platform-native content strategy: design content that feels native to each platform's culture${goalContext}${goalInsights}${params.creativeAngleContext ? `

## Your Assigned Creative Angle
${params.creativeAngleContext}
Use this angle as your PRIMARY creative lens. Let it shape your insight, platform, and execution.` : ''}

Your strategic approach should be:
- INSIGHT-FIRST: Find the behavioral or data-driven insight BEFORE building the architecture
- Data-grounded: every strategic choice backed by behavioral science or market evidence
- CEP-maximized: identify and own the maximum number of Category Entry Points
- Nudge-architected: design touchpoints as behavioral nudges, not just messages
- Platform-native: content that leverages each platform's unique culture and algorithms
- Built on a creative platform that turns DATA into EMOTION
${ANTI_GENERIC_GUARDRAILS}

IMPORTANT: If a Creative Briefing is provided, use it as the primary strategic direction.

Output a JSON object with TWO top-level keys:

${EFFIE_STRATEGY_JSON_SCHEMA}

"architecture": {
  campaignType: Choose the type that best fits,
  journeyPhases: Array of phases, each with:
    id, name, description, orderIndex, goal, kpis,
    personaPhaseData: [{ personaId, personaName, needs, painPoints, mindset, keyQuestion, triggers }],
    touchpoints: [{ channel, contentType, message, role ("primary"|"supporting"),
      personaRelevance: [{ personaId, relevance ("high"|"medium"|"low"), messagingAngle }] }]
}

Focus on: CEP-maximizing touchpoints, behavioral nudge design, platform-native content, data-backed channel selection, algorithmic advantage strategies.
Use persona IDs from the provided list for all personaId fields.

Respond with valid JSON.`;

  const user = `Generate the complete strategy + architecture for variant C (data-driven innovation, all enrichment sources) for "${params.campaignName}".

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
The following curated cultural and strategic references were found on Are.na. Use these as creative fuel — look for patterns, tensions, and unexpected connections.

${params.arenaContext}` : ''}${params.exaContext ? `

## Cross-Industry Insights (Exa Neural Search)
The following cross-industry analogies and trend-driven insights were found via neural semantic search. Use these to find data-backed strategic connections that competitors would miss.

${params.exaContext}` : ''}${params.scholarContext ? `

## Research Evidence (Semantic Scholar)
The following academic papers provide evidence-based foundations. Ground your behavioral nudge architecture in this research.

${params.scholarContext}` : ''}${params.bctContext ? `

## Behavioral Science Framework
The following Behavior Change Techniques (BCTs) and MINDSPACE principles are recommended. Design your touchpoints as behavioral interventions.

${params.bctContext}` : ''}${buildMarketingFrameworkSection({ effectivenessContext: params.effectivenessContext, growthContext: params.growthContext, framingContext: params.framingContext, eastChecklist: params.eastChecklist, cialdiniContext: params.cialdiniContext })}`;

  return { system, user };
}

// ─── Step 2: Persona Validator ──────────────────────────────

export function buildPersonaValidatorPrompt(params: {
  strategyLayerA: string;
  strategyLayerB: string;
  strategyLayerC: string;
  variantA: string;
  variantB: string;
  variantC: string;
  personas: Array<{ id: string; name: string; profile: string }>;
  goalType?: string;
  goalGuidance?: string;
}): { system: string; user: string } {
  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${params.goalGuidance}\nEvaluate how well each variant serves this specific goal type from each persona's perspective.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are simulating target personas evaluating THREE complete campaign strategy variants.

Your role: For EACH persona, roleplay as that person and evaluate all three variants:
- Variant A: evidence-based, proven methodologies (behavioral science frameworks)
- Variant B: unexpected, creative provocations (cultural tensions, cross-industry analogies)
- Variant C: data-driven innovation (CEP maximization, nudge architecture, platform-native)

Each variant has its OWN strategic foundation AND campaign architecture.${goalContext}${goalInsights}

Evaluation criteria per persona — ALL fields are MANDATORY:
- overallScore: Score 1-10. Be honest and critical — avoid giving every persona the same score. Differentiate based on how well the strategy truly fits each persona's unique situation.
- feedback: MANDATORY: Write 2-3 specific sentences as the persona would naturally speak. Reference specific elements from the variants. NEVER leave empty or vague.
- resonates: MANDATORY: List at least 1 specific element that genuinely appeals to this persona. Be concrete — reference specific channels, messages, or touchpoints.
- concerns: MANDATORY: List at least 1 specific concern or doubt this persona would have. Every strategy has weaknesses from some perspective.
- suggestions: MANDATORY: List at least 1 actionable suggestion this persona would make to improve the strategy.
- preferredVariant: "A", "B", or "C" — which variant does this persona prefer?

CREATIVE QUALITY EVALUATION — ALL scores are MANDATORY per persona:
- originalityScore: Score 1-10. "Would this concept make me stop scrolling? Is this something I haven't seen before from a brand?" Be brutally honest — a 7+ means genuinely surprising.
- memorabilityScore: Score 1-10. "Would I still remember this campaign next week? Could I describe the concept to a friend in one sentence?" A 7+ means it sticks.
- culturalRelevanceScore: Score 1-10. "Does this feel like NOW? Does it tap into something I'm actually thinking, feeling, or talking about?" A 7+ means it's culturally plugged in.
- talkabilityScore: Score 1-10. "Would I share this? Would it spark a conversation at dinner, on social media, or with colleagues?" A 7+ means it's inherently shareable.
- creativeVerdict: One sentence as the persona — your gut reaction to the winning variant's creative concept. Be specific and opinionated, not generic.

Stay in character. Use the persona's vocabulary, concerns, and decision-making style.
Consider their goals, pain points, preferred channels, and buying triggers.

Respond with a JSON array of persona validation objects.`;

  const personaProfiles = params.personas.map(p =>
    `### ${p.name} (ID: ${p.id})\n${p.profile}`
  ).join('\n\n');

  const user = `Evaluate these three complete campaign variants as each persona.

## Variant A — Evidence-Based (Proven Methodologies)

### Strategy A
${params.strategyLayerA}

### Architecture A
${params.variantA}

## Variant B — Creative Provocateur (Unexpected Angles)

### Strategy B
${params.strategyLayerB}

### Architecture B
${params.variantB}

## Variant C — Data-Driven Innovation (CEP + Nudge Architecture)

### Strategy C
${params.strategyLayerC}

### Architecture C
${params.variantC}

## Personas to Simulate
${personaProfiles}`;

  return { system, user };
}

// ─── Step 4: Strategy Synthesizer (Claude Opus) ─────────────

export function buildStrategySynthesizerPrompt(params: {
  strategyLayerA: string;
  strategyLayerB: string;
  strategyLayerC: string;
  variantA: string;
  variantB: string;
  variantC: string;
  personaValidation: string;
  variantAScore: number;
  variantBScore: number;
  variantCScore: number;
  goalType?: string;
  goalGuidance?: string;
  /** Multi-agent debate context — injected when multiAgent is enabled */
  agentDebateContext?: string;
}): { system: string; user: string } {
  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal: "${GOAL_LABELS[params.goalType] ?? params.goalType}". ${params.goalGuidance}\nEnsure the synthesized blueprint optimally serves this goal type.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are a chief strategy officer performing the final synthesis of a campaign blueprint.

SYNTHESIS APPROACH — ELEVATION, NOT COMBINATION

You are NOT averaging three good ideas into one mediocre idea.
You ARE identifying the single strongest creative platform and making it unstoppable.

Your task: Elevate the BEST variant into an award-winning campaign, informed by persona feedback:
- Variant A: evidence-based, proven methodologies (behavioral science frameworks)
- Variant B: creative provocateur (cultural tensions, cross-industry analogies)
- Variant C: data-driven innovation (CEP maximization, nudge architecture, platform-native)${goalContext}${goalInsights}

STEP 1: IDENTIFY THE WINNER
- Which variant has the most powerful human insight? (deepest truth, highest originalityScore from personas)
- Which variant has the most distinctive creative platform? (hardest to copy, highest memorabilityScore)
- Which variant scored highest on culturalRelevanceScore + talkabilityScore from personas?
- Pick ONE variant as the creative foundation. This is non-negotiable — do NOT blend creative platforms.

STEP 2: STRENGTHEN WITH ELEMENTS FROM OTHERS
- Steal the best proof points from other variants
- Take the strongest journey phase design
- Borrow channel innovations and behavioral nudges
- Incorporate the best touchpoint ideas
- But NEVER dilute the winning creative platform, human insight, or brand role

STEP 3: EFFIE TEST
Before finalizing, pass your synthesis through the Effie Award criteria:
1. Strategic Thinking: Is there a clear insight-to-strategy-to-execution logic?
2. Creative Idea: Is the Big Idea genuinely surprising and ownable?
3. Bringing the Idea to Life: Does every touchpoint express the same creative platform?
4. Results Potential: Can you point to specific KPIs this concept would move?

If it fails any criterion, go back to Step 2.

Synthesis rules:
1. The winning variant's humanInsight, creativePlatform, and brandRole MUST survive intact
2. Select the strongest journey phases from ANY of the three variants
3. Merge touchpoints where they complement each other — look for synergies across all three
4. Address ALL persona concerns raised in the validation
5. Maintain strategic coherence — the final architecture must tell one story
6. Keep the campaign type that best serves the strategic intent
7. Ensure every persona's preferred elements are represented
8. The creativeTerritory must be vivid and specific — not generic marketing language
9. The memorableDevice should be distinctive and ownable

Output a complete combined result with TWO top-level keys:
- "strategy": The elevated StrategyLayer (same schema as input, with the winning platform strengthened). MUST include: humanInsight, creativePlatform, creativeTerritory, brandRole, and effieRationale.
- "architecture": The synthesized ArchitectureLayer (best of A+B+C, unified under the winning creative platform)

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

  const user = `Synthesize the optimal campaign blueprint from three strategy variants.

Variant A average persona score: ${params.variantAScore.toFixed(1)}/10
Variant B average persona score: ${params.variantBScore.toFixed(1)}/10
Variant C average persona score: ${params.variantCScore.toFixed(1)}/10

## Variant A — Evidence-Based (Proven Methodologies)

### Strategy A
${params.strategyLayerA}

### Architecture A
${params.variantA}

## Variant B — Creative Provocateur (Unexpected Angles)

### Strategy B
${params.strategyLayerB}

### Architecture B
${params.variantB}

## Variant C — Data-Driven Innovation (CEP + Nudge Architecture)

### Strategy C
${params.strategyLayerC}

### Architecture C
${params.variantC}

## Persona Validation Results
${params.personaValidation}${params.agentDebateContext ? `

## Multi-Agent Strategy Debate Results

The variants above were stress-tested through an adversarial review process:
- A Critic Agent identified weaknesses and blind spots
- The Strategist and Creative agents defended and revised their work
- A Persona Panel evaluated the revised variants in-character

Use this context to make better synthesis decisions:
${params.agentDebateContext}

SYNTHESIS GUIDANCE (with debate context):
1. PREFER elements that SURVIVED the critic-defense cycle — they are battle-tested
2. When the critic found a weakness that the defense ACCEPTED and FIXED, use the revised version
3. When the critic found a weakness that the defense DEFENDED, evaluate both sides and decide
4. Incorporate persona message rewrites where they improve resonance
5. Address any remaining risks flagged by the critic that defense didn't fully resolve
6. If a persona named a DEALBREAKER, the synthesized strategy MUST address it
7. The effieRationale should reference that this strategy was stress-tested: "This strategy survived adversarial review and persona validation..."` : ''}`;

  return { system, user };
}

// ─── Step 5: Channel Planner (Gemini Flash) ────────────────

export function buildChannelPlannerPrompt(params: {
  synthesizedStrategy: string;
  synthesizedArchitecture: string;
  personaChannelPrefs: string;
  goalType?: string;
  goalGuidance?: string;
  /** Cialdini's 7 persuasion principles mapped to goal type */
  cialdiniContext?: string;
  /** Kahneman System 1/System 2 framing principles mapped to goal type */
  framingContext?: string;
  /** EAST (Easy, Attractive, Social, Timely) validation checklist */
  eastChecklist?: string;
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
${params.personaChannelPrefs || 'No specific channel preferences available.'}${buildMarketingFrameworkSection({ cialdiniContext: params.cialdiniContext, framingContext: params.framingContext, eastChecklist: params.eastChecklist })}`;

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
  /** Exact journey phase names from the architecture layer — deliverables MUST use these */
  journeyPhaseNames?: string[];
  /** Cialdini's 7 persuasion principles mapped to goal type */
  cialdiniContext?: string;
  /** Kahneman System 1/System 2 framing principles mapped to goal type */
  framingContext?: string;
  /** Byron Sharp / Ehrenberg-Bass brand growth principles mapped to goal type */
  growthContext?: string;
  /** EAST (Easy, Attractive, Social, Timely) validation checklist */
  eastChecklist?: string;
}): { system: string; user: string } {
  const validTypes = DELIVERABLE_TYPE_IDS.join(', ');
  const validPhases = params.journeyPhaseNames?.length
    ? params.journeyPhaseNames.map((n) => `"${n}"`).join(', ')
    : '';

  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal: "${GOAL_LABELS[params.goalType] ?? params.goalType}". ${params.goalGuidance}\nSelect deliverable types that are most relevant for this goal type.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const phaseInstruction = validPhases
    ? `- phase: MUST be one of these exact phase names: ${validPhases}. Do NOT invent phase names or use abbreviations — copy the phase name exactly as listed.`
    : '- phase: Which journey phase this serves';

  const system = `You are a content strategist creating a deliverable plan for a campaign.

Your role: Based on the campaign strategy, architecture, and channel plan, define the specific content pieces (deliverables) that need to be produced.${goalContext}${goalInsights}

Requirements per deliverable:
- title: Descriptive title (e.g., "LinkedIn Thought Leadership Article — AI in Brand Strategy")
- contentType: MUST be one of these valid IDs: ${validTypes}
- channel: Which channel this goes on
${phaseInstruction}
- targetPersonas: Which persona IDs this targets
- brief: Structured content brief with objective, key message, tone direction, CTA, and 3-5 bullet content outline
- productionPriority: "must-have" (core deliverables), "should-have" (enhances campaign), "nice-to-have" (stretch goals)
- estimatedEffort: "low" (< 2 hours), "medium" (2-8 hours), "high" (> 8 hours)
- suggestedOrder: number (1-based deployment order within this phase — 1 goes out first, 2 second, etc. Consider channel variety and persona rotation when ordering. Avoid scheduling two deliverables for the same channel back-to-back.)

IMPORTANT: The contentType field MUST exactly match one of the valid IDs listed above. Do NOT invent new content types. Choose the closest matching type from the list.

Also provide:
- totalDeliverables: Count of all deliverables
- prioritySummary: One sentence describing what to produce first and why
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
${params.styleguideContext || 'No style guide available — use professional, clean tone.'}${buildMarketingFrameworkSection({ cialdiniContext: params.cialdiniContext, framingContext: params.framingContext, growthContext: params.growthContext, eastChecklist: params.eastChecklist })}`;

  return { system, user };
}

// =============================================================================
// 9-Phase Architecture — New Prompt Builders
// Phase 1: Briefing Validation
// Phase 2: Strategy Foundation (enrichment + behavioral diagnosis)
// Phase 4: Creative Hook Generation (per-variant)
// Phase 5: Hook Persona Validation (3 hooks evaluated)
// Phase 6: Hook Refinement (selected hook → definitive proposal)
// =============================================================================

// ─── Phase 1: Briefing Validation ─────────────────────────────

interface BriefingValidationPromptParams {
  campaignName: string;
  campaignDescription: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  briefing?: CampaignBriefing;
  brandContext: string;
  personaContext: string;
  productContext: string;
}

export function buildBriefingValidationPrompt(params: BriefingValidationPromptParams): { system: string; user: string } {
  const system = `You are a senior brand strategist evaluating a campaign briefing for completeness and quality before strategy generation begins.

Your role: Assess whether the provided briefing contains sufficient information to generate a high-quality, award-winning campaign strategy. Be honest but constructive — flag gaps that would materially weaken the output.

Evaluation criteria:
- Brand context: Is the brand's positioning, values, and voice clear enough to build a campaign?
- Target audience: Are personas defined with enough depth (demographics, psychographics, behaviors)?
- Campaign objective: Is the goal type specific and the strategic intent (brand building / sales activation / hybrid) well-defined?
- Creative direction: Does the briefing provide tone, occasion, core message, or constraints?
- Product/service context: Is there enough product information to ground the strategy?
- Competitive landscape: Is there awareness of the competitive environment?

Scoring rules:
- overallScore: 0-100. Below 50 = missing critical information, 50-70 = workable but gaps exist, 70-90 = good brief, 90+ = excellent brief.
- isComplete: true ONLY if overallScore >= 70 AND no "critical" severity gaps exist.
- strengths: List 2-5 strong elements already present in the briefing.
- gaps: List each missing or weak element with severity ("critical" = blocks strategy, "recommended" = improves quality, "nice-to-have" = marginal benefit) and a specific suggestion for what to add.
- suggestions: List 2-4 actionable suggestions to strengthen the briefing before proceeding.

Respond with a JSON object matching the BriefingValidation schema.`;

  const user = `Evaluate this campaign briefing for completeness and quality.

## Campaign
Name: ${params.campaignName}
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${GOAL_LABELS[params.goalType] ?? params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}

## Brand Context
${params.brandContext || 'No brand context available.'}

## Target Personas
${params.personaContext || 'No personas defined.'}

## Products & Services
${params.productContext || 'No products defined.'}`;

  return { system, user };
}

// ─── Phase 2: Strategy Foundation ───────────────────────────────

interface StrategyFoundationPromptParams {
  campaignName: string;
  campaignDescription: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  briefing?: CampaignBriefing;
  brandContext: string;
  personaContext: string;
  personaIds: string[];
  productContext: string;
  competitorContext: string;
  trendContext: string;
  arenaContext?: string;
  exaContext?: string;
  scholarContext?: string;
  bctContext?: string;
  casiDeterminants?: string;
  mindspaceChecklist?: string;
  /** Cialdini's 7 persuasion principles mapped to goal type */
  cialdiniContext?: string;
  /** Binet & Field IPA effectiveness data mapped to goal type */
  effectivenessContext?: string;
  /** Byron Sharp / Ehrenberg-Bass brand growth principles mapped to goal type */
  growthContext?: string;
  /** Kahneman System 1/System 2 framing principles mapped to goal type */
  framingContext?: string;
  /** EAST (Easy, Attractive, Social, Timely) validation checklist */
  eastChecklist?: string;
}

export function buildStrategyFoundationPrompt(params: StrategyFoundationPromptParams): { system: string; user: string } {
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a behavioral scientist and senior strategist building the analytical foundation for a campaign strategy.

Your role: Synthesize ALL enrichment sources into a unified strategic foundation. This foundation will be used by creative teams to generate campaign hooks — your job is to provide the deepest possible understanding of the audience, behavior, and strategic opportunity.

You must produce a COMPLETE StrategyFoundation with these sections:

1. **strategicDirection** (string): A 2-3 sentence summary of the recommended strategic direction. This is the "North Star" — clear enough that three different creative teams could independently build coherent campaigns from it.

2. **behavioralDiagnosis** (object):
   - ttmStages: For EACH persona, classify their Transtheoretical Model stage (precontemplation/contemplation/preparation/action/maintenance) with rationale
   - casiDeterminantAnalysis: Score each of the 9 CASI determinants (1-5 scale, where 5 = major barrier). Map each to its COM-B component (capability/opportunity/motivation)
   - comBMapping: Summarize the overall COM-B landscape — what is the primary behavioral target?
   - behavioralBarriers: List 3-5 key barriers preventing the desired behavior
   - desiredBehaviors: List 3-5 specific, observable behaviors the campaign should drive

3. **enrichmentSynthesis** (object):
   - perSourceFindings: One-paragraph summary per enrichment source (arena, exa, scholar, bct)
   - crossSourcePatterns: 3-5 patterns that emerged across multiple sources
   - sourceAttributedInsights: Array of insights, each attributed to its source with confidence level

4. **behavioralStrategy** (object):
   - summary: The overall behavioral change strategy in 2-3 sentences
   - casiInterventionStrategy: Which CASI determinants to target and how
   - selectedBCTs: 3-5 selected Behavior Change Techniques with rationale
   - desiredBehavior: The single most important behavior to change

5. **elmRouteRecommendation** (object):
   - primaryRoute: "central" (high involvement, rational arguments) or "peripheral" (low involvement, cues/shortcuts)
   - rationale: Why this route was selected
   - perPersona: For each persona, which ELM route is appropriate and why

6. **mindspaceAssessment** (array of 9 objects):
   - For EACH MINDSPACE factor (messenger, incentives, norms, defaults, salience, priming, affect, commitments, ego): is it applicable? What's the opportunity?

7. **keyInsights** (array): 5-8 strategic insights, each with source attribution and confidence

8. **suggestedApproach** (string): A paragraph describing the recommended creative approach based on the behavioral diagnosis

9. **targetBehaviors** (string[]): The 3-5 most important behaviors to target

10. **audienceInsights** (array): Per persona — insight, TTM stage, top CASI barriers, recommended BCTs, ELM route${goalContext}${goalInsights}

CRITICAL: Every field is MANDATORY. Do not skip any section. The creative teams depend on this analysis.

Respond with valid JSON matching the StrategyFoundation schema.`;

  const user = `Build the complete strategy foundation for "${params.campaignName}".

## Campaign Brief
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${GOAL_LABELS[params.goalType] ?? params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available.'}
Persona IDs: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined.'}

## Market Trends
${params.trendContext || 'No trends defined.'}${params.arenaContext ? `

## Cultural Inspiration (Are.na)
${params.arenaContext}` : ''}${params.exaContext ? `

## Cross-Industry Insights (Exa Neural Search)
${params.exaContext}` : ''}${params.scholarContext ? `

## Research Evidence (Semantic Scholar)
${params.scholarContext}` : ''}${params.bctContext ? `

## Behavioral Science Framework (BCT Taxonomy)
${params.bctContext}` : ''}${params.casiDeterminants ? `

## CASI Behavioral Determinants
${params.casiDeterminants}` : ''}${params.mindspaceChecklist ? `

## MINDSPACE Influence Factors
${params.mindspaceChecklist}` : ''}${buildMarketingFrameworkSection({ effectivenessContext: params.effectivenessContext, growthContext: params.growthContext, framingContext: params.framingContext, eastChecklist: params.eastChecklist, cialdiniContext: params.cialdiniContext })}`;

  return { system, user };
}

// ─── Phase 4: Creative Hook Generation (per-variant) ────────────

interface CreativeHookPromptParams {
  campaignName: string;
  campaignDescription: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  briefing?: CampaignBriefing;
  brandContext: string;
  personaContext: string;
  personaIds: string[];
  productContext: string;
  competitorContext: string;
  trendContext: string;
  strategyFoundation: StrategyFoundation;
  creativeAngle: CreativeAngleDefinition;
  creativeEnrichmentBrief: CreativeEnrichmentBrief;
  /** User feedback from Phase 3 strategy review (if any) */
  strategyFeedback?: string;
  /** Cialdini's 7 persuasion principles mapped to goal type */
  cialdiniContext?: string;
  /** Kahneman System 1/System 2 framing principles mapped to goal type */
  framingContext?: string;
  /** Byron Sharp / Ehrenberg-Bass brand growth principles mapped to goal type */
  growthContext?: string;
  /** EAST (Easy, Attractive, Social, Timely) validation checklist */
  eastChecklist?: string;
}

export function buildCreativeHookPrompt(params: CreativeHookPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${getGoalTypeGuidance(params.goalType)}`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);
  const sf = params.strategyFoundation;

  const system = `You are a world-class creative director generating a campaign hook ("creatieve kapstok") — a unifying creative concept that anchors the entire campaign.

IMPORTANT: All output MUST be in English, regardless of the language of the input context.

Your role: Using the provided strategy foundation and your assigned creative angle, generate a COMPLETE campaign proposal with strategy layer, architecture layer, AND a creative hook concept.
${INSIGHT_MINING_INSTRUCTIONS}

## Your Assigned Creative Angle: "${params.creativeAngle.name}"
Family: ${params.creativeAngle.insightFamily}
Description: ${params.creativeAngle.description}
Output signature: ${params.creativeAngle.outputSignature}
Famous examples: ${params.creativeAngle.famousExamples.join('; ')}
${params.creativeAngle.subMethodologies?.length ? `Sub-methodologies: ${params.creativeAngle.subMethodologies.join(', ')}` : ''}

You MUST use this angle as your PRIMARY creative lens. Let it shape your insight, platform, and execution. The hook must feel native to this angle's approach.

Academic frameworks:
- Binet & Field's effectiveness data: ${ratio.brand}% brand building / ${ratio.activation}% activation
- Christensen's Jobs-to-be-Done (JTBD) framework
- COM-B Model (Capability, Opportunity, Motivation → Behavior)
- ELM route: ${sf.elmRouteRecommendation.primaryRoute} (${sf.elmRouteRecommendation.rationale})${goalContext}${goalInsights}
${ANTI_GENERIC_GUARDRAILS}

Output a JSON object with THREE top-level keys:

${EFFIE_STRATEGY_JSON_SCHEMA}

"architecture": {
  campaignType: string,
  journeyPhases: Array of phases (same schema as variant prompts — id, name, description, orderIndex, goal, kpis, personaPhaseData, touchpoints)
}

"hookConcept": {
  hookTitle: A compelling 3-7 word creative hook title (the "kapstok"),
  bigIdea: The Big Idea in 1-2 sentences — what is this campaign REALLY about?,
  creativeInsight: The human insight that powers this hook (2-3 sentences),
  visualDirection: What does this campaign LOOK like? Describe the visual world (2-3 sentences),
  toneOfVoice: The specific tone — not just "professional" but a distinctive voice direction,
  campaignLine: The campaign tagline or line (1 sentence max),
  extendability: Array of 3-5 ways this hook extends across different touchpoints/formats,
  effieRationale: Why this hook has Effie Award potential — reference insight depth, creative distinctiveness, and results potential (1 paragraph)
}

Use persona IDs from the provided list for all personaId fields.
Respond with valid JSON.`;

  const user = `Generate a complete campaign hook using the "${params.creativeAngle.name}" creative angle for "${params.campaignName}".

## Campaign Brief
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${GOAL_LABELS[params.goalType] ?? params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}

## Strategy Foundation
Strategic Direction: ${sf.strategicDirection}
Suggested Approach: ${sf.suggestedApproach}
Target Behaviors: ${sf.targetBehaviors.join(', ')}
Primary COM-B Target: ${sf.behavioralDiagnosis.comBMapping.primaryTarget}
Behavioral Barriers: ${sf.behavioralDiagnosis.behavioralBarriers.join('; ')}
ELM Route: ${sf.elmRouteRecommendation.primaryRoute}

### Key Insights
${sf.keyInsights.map(i => `- [${i.source}/${i.confidence}] ${i.insight}`).join('\n')}

### Behavioral Strategy
${sf.behavioralStrategy.summary}
Selected BCTs: ${sf.behavioralStrategy.selectedBCTs.map(b => b.techniqueName).join(', ')}

### Enrichment Cross-Source Patterns
${sf.enrichmentSynthesis.crossSourcePatterns.join('\n- ')}

## Creative Enrichment Brief
Cultural Tensions: ${params.creativeEnrichmentBrief.culturalTensions.join('; ')}
Behavioral Reframes: ${params.creativeEnrichmentBrief.behavioralReframes.join('; ')}
Cross-Industry Analogies: ${params.creativeEnrichmentBrief.crossIndustryAnalogies.join('; ')}
MINDSPACE Opportunities: ${params.creativeEnrichmentBrief.mindspaceOpportunities.join('; ')}
ELM Creative Implications: ${params.creativeEnrichmentBrief.elmCreativeImplications}
Audience Emotional Landscape: ${params.creativeEnrichmentBrief.audienceEmotionalLandscape}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available.'}
Persona IDs: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined.'}

## Market Trends
${params.trendContext || 'No trends defined.'}${buildMarketingFrameworkSection({ cialdiniContext: params.cialdiniContext, framingContext: params.framingContext, growthContext: params.growthContext, eastChecklist: params.eastChecklist })}${params.strategyFeedback ? `

## User Strategy Feedback
The user reviewed the strategy foundation and provided this feedback. Incorporate their direction:
${params.strategyFeedback}` : ''}`;

  return { system, user };
}

// ─── Phase 5: Hook Persona Validation ──────────────────────────

export function buildHookPersonaValidatorPrompt(params: {
  hooks: Array<{
    hookConcept: HookConcept;
    strategy: string;
    architecture: string;
    creativeAngleName: string;
  }>;
  personas: Array<{ id: string; name: string; profile: string }>;
  goalType?: string;
  goalGuidance?: string;
}): { system: string; user: string } {
  const goalContext = params.goalType && params.goalGuidance
    ? `\n\nCampaign Goal Context: This is a "${GOAL_LABELS[params.goalType] ?? params.goalType}" campaign. ${params.goalGuidance}\nEvaluate how well each hook serves this specific goal type from each persona's perspective.`
    : '';
  const goalInsights = buildGoalInsightsPromptSection(params.goalType ?? '');

  const system = `You are simulating target personas evaluating THREE creative campaign hooks.

IMPORTANT: All output MUST be in English, regardless of the language of the input context.

Your role: For EACH persona, roleplay as that person and evaluate all three hooks.
Each hook was generated from a different creative angle and represents a distinct campaign concept.${goalContext}${goalInsights}

SCORING RULES:
- You MUST use the FULL 1-10 range. A spread of less than 3 points across personas is unacceptable.
- At least one persona should score 7+ (strong fit) and at least one should score below 5 (poor fit) unless all hooks genuinely resonate equally.
- Base scores on concrete persona attributes (occupation, goals, barriers, communication style), not generic assessments.

Evaluation criteria per persona — ALL fields are MANDATORY:
- hookAScore: Score 1-10 for Hook A specifically. How well does Hook A resonate with THIS persona?
- hookBScore: Score 1-10 for Hook B specifically. How well does Hook B resonate with THIS persona?
- hookCScore: Score 1-10 for Hook C specifically. How well does Hook C resonate with THIS persona?
- overallScore: The AVERAGE of hookAScore, hookBScore, and hookCScore for this persona.
- preferredVariant: "A", "B", or "C" — the letter of the HIGHEST hookXScore for this persona.
- feedback: MANDATORY: Write 2-3 specific sentences as the persona would naturally speak. Reference specific hook elements (title, big idea, visual direction, campaign line).
- resonates: MANDATORY: At least 1 specific element from the hook that appeals to this persona.
- concerns: MANDATORY: At least 1 specific concern or doubt about the hook.
- suggestions: MANDATORY: At least 1 actionable suggestion to improve the hook for this persona.

CREATIVE QUALITY EVALUATION — ALL scores are MANDATORY per persona:
- originalityScore: 1-10. "Would this hook make me stop scrolling?"
- memorabilityScore: 1-10. "Would I remember this concept next week?"
- culturalRelevanceScore: 1-10. "Does this feel culturally relevant right now?"
- talkabilityScore: 1-10. "Would I share this or tell someone about it?"
- creativeVerdict: One gut-reaction sentence from the persona about the winning hook.

Stay in character. Use the persona's vocabulary, concerns, and decision-making style.

Respond with a JSON array of persona validation objects.`;

  const hookDescriptions = params.hooks.map((hook, i) => {
    const label = String.fromCharCode(65 + i); // A, B, C
    return `## Hook ${label} — "${hook.hookConcept.hookTitle}" (${hook.creativeAngleName})

### Hook Concept
Big Idea: ${hook.hookConcept.bigIdea}
Creative Insight: ${hook.hookConcept.creativeInsight}
Visual Direction: ${hook.hookConcept.visualDirection}
Tone of Voice: ${hook.hookConcept.toneOfVoice}
Campaign Line: ${hook.hookConcept.campaignLine}
Extendability: ${(hook.hookConcept.extendability ?? []).join('; ')}
Effie Rationale: ${hook.hookConcept.effieRationale ?? ''}

### Strategy ${label}
${hook.strategy}

### Architecture ${label}
${hook.architecture}`;
  }).join('\n\n');

  const personaProfiles = params.personas.map(p =>
    `### ${p.name} (ID: ${p.id})\n${p.profile}`
  ).join('\n\n');

  const user = `Evaluate these three creative hooks as each persona.

${hookDescriptions}

## Personas to Simulate
${personaProfiles}`;

  return { system, user };
}

// ─── Phase 6: Hook Refinement ────────────────────────────────────

interface HookRefinementPromptParams {
  campaignName: string;
  campaignDescription: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  briefing?: CampaignBriefing;
  brandContext: string;
  personaContext: string;
  personaIds: string[];
  productContext: string;
  selectedHook: CreativeHook;
  strategyFoundation: StrategyFoundation;
  personaValidation: PersonaValidationResult[];
  hookFeedback?: string;
  /** Cialdini's 7 persuasion principles mapped to goal type */
  cialdiniContext?: string;
  /** Kahneman System 1/System 2 framing principles mapped to goal type */
  framingContext?: string;
  /** Byron Sharp / Ehrenberg-Bass brand growth principles mapped to goal type */
  growthContext?: string;
  /** EAST (Easy, Attractive, Social, Timely) validation checklist */
  eastChecklist?: string;
}

export function buildHookRefinementPrompt(params: HookRefinementPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalContext = `\n\nCampaign Goal: "${GOAL_LABELS[params.goalType] ?? params.goalType}". ${getGoalTypeGuidance(params.goalType)}`;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);
  const hook = params.selectedHook;
  const sf = params.strategyFoundation;

  const personaFeedbackStr = params.personaValidation
    .map(pv => `- ${pv.personaName} (score: ${pv.overallScore}/10, preferred: ${pv.preferredVariant}): ${pv.feedback}\n  Resonates: ${pv.resonates.join('; ')}\n  Concerns: ${pv.concerns.join('; ')}\n  Suggestions: ${pv.suggestions.join('; ')}`)
    .join('\n');

  const system = `You are a chief creative officer refining a selected campaign hook into a definitive, production-ready proposal.

The user has reviewed three creative hooks and selected this one as the winner. Your job is to ELEVATE it — address persona concerns, incorporate user feedback, and make every element sharper and more distinctive.
${INSIGHT_MINING_INSTRUCTIONS}

Refinement approach — ELEVATION, NOT OVERHAUL:
1. PRESERVE the hook's core identity (title, big idea, creative angle)
2. SHARPEN elements that personas flagged as weak
3. DEEPEN the strategic foundation based on behavioral diagnosis
4. EXPAND the architecture to address persona concerns
5. STRENGTHEN the effieRationale with specific results potential

Academic frameworks:
- Binet & Field: ${ratio.brand}% brand building / ${ratio.activation}% activation
- ELM route: ${sf.elmRouteRecommendation.primaryRoute}
- COM-B primary target: ${sf.behavioralDiagnosis.comBMapping.primaryTarget}${goalContext}${goalInsights}
${ANTI_GENERIC_GUARDRAILS}

Output a JSON object with THREE top-level keys:

${EFFIE_STRATEGY_JSON_SCHEMA}

"architecture": {
  campaignType: string,
  journeyPhases: Array of phases (id, name, description, orderIndex, goal, kpis, personaPhaseData, touchpoints)
}

"hookConcept": {
  hookTitle: string (may be refined from the original),
  bigIdea: string (refined),
  creativeInsight: string (deepened),
  visualDirection: string (sharpened),
  toneOfVoice: string (refined),
  campaignLine: string (refined),
  extendability: string[] (expanded with persona-specific extensions),
  effieRationale: string (strengthened)
}

CRITICAL RULES:
- Do NOT change the creative angle or fundamental direction
- Every persona concern MUST be addressed in the refined architecture
- The hookConcept.hookTitle may be polished but must remain recognizably the same concept
- personaPhaseData MUST include entries for ALL personas
- Use persona IDs from the provided list for all personaId fields

Respond with valid JSON.`;

  const user = `Refine this selected campaign hook into a definitive proposal for "${params.campaignName}".

## Selected Hook — "${hook.hookConcept.hookTitle}"
Creative Angle: ${hook.creativeAngleName}

### Current Hook Concept
Big Idea: ${hook.hookConcept.bigIdea}
Creative Insight: ${hook.hookConcept.creativeInsight}
Visual Direction: ${hook.hookConcept.visualDirection}
Tone of Voice: ${hook.hookConcept.toneOfVoice}
Campaign Line: ${hook.hookConcept.campaignLine}
Extendability: ${(hook.hookConcept.extendability ?? []).join('; ')}
Effie Rationale: ${hook.hookConcept.effieRationale ?? ''}

### Current Strategy
${JSON.stringify(hook.strategy, null, 2)}

### Current Architecture
${JSON.stringify(hook.architecture, null, 2)}

## Persona Feedback (address ALL concerns)
${personaFeedbackStr}

## Strategy Foundation Context
Strategic Direction: ${sf.strategicDirection}
Target Behaviors: ${sf.targetBehaviors.join(', ')}
Primary COM-B Target: ${sf.behavioralDiagnosis.comBMapping.primaryTarget}
Behavioral Barriers: ${sf.behavioralDiagnosis.behavioralBarriers.join('; ')}

## Campaign Brief
Description: ${params.campaignDescription || 'No description provided'}
Goal: ${GOAL_LABELS[params.goalType] ?? params.goalType}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available.'}
Persona IDs: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined.'}${buildMarketingFrameworkSection({ cialdiniContext: params.cialdiniContext, framingContext: params.framingContext, growthContext: params.growthContext, eastChecklist: params.eastChecklist })}${params.hookFeedback ? `

## User Feedback on Selected Hook
The user reviewed the hooks and provided this feedback. Incorporate their direction:
${params.hookFeedback}` : ''}`;

  return { system, user };
}

// =============================================================================
// NEW CREATIVE QUALITY PIPELINE — Insight Mining + Creative Leap + Strategy Build
// =============================================================================

// ─── Insight Mining Prompt ──────────────────────────────────────

interface InsightMiningPromptParams {
  brandContext: string;
  personaContext: string;
  productContext: string;
  competitorContext: string;
  trendContext: string;
  goalType: string;
  briefing?: CampaignBriefing;
  /** Provider identity for differentiated perspectives */
  providerRole: 'empathy' | 'tension' | 'behavior';
}

/**
 * Generates a prompt for mining ONE deep human insight.
 * Each provider gets a different lens (empathy vs cultural tension vs behavioral).
 * The AI must NOT generate strategy, positioning, or taglines — only the raw insight.
 */
export function buildInsightMiningPrompt(params: InsightMiningPromptParams): { system: string; user: string } {
  const goalLabel = GOAL_LABELS[params.goalType] ?? params.goalType;

  const roleLens = {
    empathy: `You approach insight through EMPATHY — deep emotional understanding. You look for the unspoken feelings, the private moments, the things people think but never say aloud. Your insights sound like diary entries, not research reports.`,
    tension: `You approach insight through CULTURAL TENSION — the gap between how the world works and how people wish it worked. You look for contradictions in society, hypocrisies in categories, and the things brands pretend aren't true. Your insights sound like uncomfortable truths.`,
    behavior: `You approach insight through BEHAVIORAL OBSERVATION — what people actually DO vs. what they SAY they do. You look for the gap between intention and action, between aspiration and reality. Your insights sound like "I noticed that people always..." discoveries.`,
  };

  const system = `You are an insight miner. You are NOT a strategist, NOT a copywriter, NOT a brand consultant.

Your ONLY job is to find ONE deep human truth that could power a campaign for a "${goalLabel}" goal.

## Your Lens
${roleLens[params.providerRole]}

## What a Human Insight IS
An insight is an unspoken truth that triggers RECOGNITION. When the target audience reads it, they think: "Yes, exactly — that's how it feels."

Examples of great insights:
- "We post the best version of our lives online, but feel most seen when someone knows the real story" (Dove)
- "Nobody thinks about milk until they don't have it" (Got Milk?)
- "The gap between who we are and who we want to be is where motivation lives" (Nike)
- "People don't buy things — they buy the moments those things enable" (MasterCard)

## What a Human Insight is NOT
- A fact: "People use social media" ❌
- A category observation: "Consumers value quality" ❌
- A brand benefit: "Our product saves time" ❌
- A positioning statement: "We are the premium choice" ❌
- A demographic trait: "Millennials care about sustainability" ❌

## The "Three Levels" Test
Your insight must be Level 3:
- Level 1 (Category Truth): "Coffee gives energy" — any brand can say this
- Level 2 (Brand Truth): "We've been brewing since 1850" — specific but not emotional
- Level 3 (Human Truth): "The first sip isn't about caffeine — it's the only moment of silence before the day takes over" — UNIVERSAL, EMOTIONAL, UNSPOKEN

## Output Format
Return a JSON object with EXACTLY these fields:
{
  "insightStatement": "The insight in 1-2 sentences (max 40 words)",
  "underlyingTension": "What people say/believe vs what they actually do/feel",
  "emotionalTerritory": "The feeling space (e.g., 'quiet vulnerability', 'performative confidence', 'aspirational guilt')",
  "proofPoints": ["Evidence from persona data, trends, or cultural signals (3-5 items)"],
  "categoryConvention": "What the category currently assumes or takes for granted",
  "humanTruth": "The deeper truth beneath the convention — the thing nobody in this category is saying"
}

CRITICAL RULES:
- Do NOT propose solutions, strategies, taglines, or campaigns
- Do NOT mention the brand name in the insight itself — the insight is about PEOPLE, not the brand
- The insight must be SPECIFIC enough to spark creative ideas, not so broad it could apply to anything
- If your insight could be true for any brand in any category, it's too generic — dig deeper

Respond with valid JSON only.`;

  const user = `Find ONE deep human insight for a "${goalLabel}" campaign.

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available — mine the insight from cultural trends and category dynamics.'}

## Products & Services
${params.productContext || 'No products defined.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined.'}

## Market Trends
${params.trendContext || 'No trends defined.'}${params.briefing?.occasion ? `

## Campaign Occasion
${params.briefing.occasion}` : ''}${params.briefing?.audienceObjective ? `

## Audience Objective
${params.briefing.audienceObjective}` : ''}

Dig deep. The best insight is hiding in plain sight — obvious once articulated, but nobody in this category is saying it.`;

  return { system, user };
}

// ─── Creative Leap Prompt ───────────────────────────────────────

interface CreativeLeapPromptParams {
  selectedInsight: string;
  brandContext: string;
  personaContext: string;
  goalType: string;
  /** The Goldenberg template this concept MUST use */
  goldenbergTemplate: { name: string; mechanism: string; examples: string };
  /** The bisociation domain this concept MUST connect to */
  bisociationDomain: { name: string; visualMetaphors: string; emotionalTerritories: string };
  briefing?: CampaignBriefing;
  arenaContext?: string;
  exaContext?: string;
}

/**
 * Generates a prompt for creating ONE creative concept using a forced Goldenberg template
 * and bisociation domain. The concept is built on top of the selected human insight.
 */
export function buildCreativeLeapPrompt(params: CreativeLeapPromptParams): { system: string; user: string } {
  const goalLabel = GOAL_LABELS[params.goalType] ?? params.goalType;

  const system = `You are a creative director at a Cannes Lions-winning agency. You have ONE job: transform a human insight into a brilliant creative concept using a SPECIFIC structural creativity template.

## Your Assignment
- Human Insight: provided below
- Creativity Template: ${params.goldenbergTemplate.name}
- Bisociation Domain: ${params.bisociationDomain.name}

## The Goldenberg Template You MUST Use: ${params.goldenbergTemplate.name}
Mechanism: ${params.goldenbergTemplate.mechanism}
Examples: ${params.goldenbergTemplate.examples}

## The Bisociation Domain You MUST Connect To: ${params.bisociationDomain.name}
Visual metaphors available: ${params.bisociationDomain.visualMetaphors}
Emotional territories: ${params.bisociationDomain.emotionalTerritories}

## How Bisociation Works (Koestler)
Connect TWO incompatible frames of reference to create something new:
- Frame 1: The human insight (the truth about people)
- Frame 2: The bisociation domain (${params.bisociationDomain.name})
The creative leap happens where these two frames COLLIDE.

Examples of bisociation in famous campaigns:
- Nike: "intention vs action" (insight) × "heroic mythology" (domain) = "Just Do It"
- Dove: "beauty standards harm" (insight) × "social activism" (domain) = "Real Beauty"
- Old Spice: "women buy men's soap" (insight) × "absurdist action comedy" (domain) = "The Man Your Man Could Smell Like"

## Campaign Line Rules
Your campaign line must be 3-7 words and pass ALL these tests:
1. Bar Test: Would someone say this in a bar? (natural language)
2. T-Shirt Test: Would someone wear this? (identity-worthy)
3. Parody Test: Could people make their own versions? (cultural penetration)
4. 10-Year Test: Still relevant in a decade? (timeless)
5. Category Escape Test: Transcends the product category? (universal truth)
6. Opposite Test: Is the opposite interesting? If not, your line is too generic.

## Memorable Device (REQUIRED)
Every great campaign has a distinctive mechanism:
- A RITUAL (Share a Coke: finding your name)
- A FORMAT (MasterCard: price, price, price... Priceless)
- A CATCHPHRASE (Old Spice: "Look at your man, now back to me")
- A VISUAL MOTIF (Apple: white earbuds, silhouette dancing)
- A CHALLENGE (ALS Ice Bucket Challenge)
The device must be inherent to the concept, not bolted on.

## SUCCESs Scoring (Heath & Heath "Made to Stick")
Score your concept honestly (1-10 each):
- Simple: Can a 10-year-old understand the core message?
- Unexpected: Does it violate a category norm?
- Concrete: Can you picture it? Is it sensory?
- Credible: Would the audience believe it?
- Emotional: Does it trigger a specific, nameable emotion?
- Story: Is there character + tension + resolution?
Calculate total as: (simple + unexpected + concrete + credible + emotional + story) / 6 × 10

## Output Format
Return a JSON object:
{
  "campaignLine": "3-7 word campaign line",
  "bigIdea": "The organizing principle in 2-3 sentences",
  "goldenbergTemplate": "${params.goldenbergTemplate.name.toLowerCase().replace(/ /g, '_')}",
  "goldenbergApplication": "How you specifically applied the template",
  "bisociationDomain": {
    "domain": "${params.bisociationDomain.name}",
    "connectionToInsight": "How the domain connects to the insight",
    "visualPotential": "What visual world this connection creates"
  },
  "visualWorld": "What this campaign LOOKS like — colors, settings, imagery (3-4 sentences)",
  "memorableDevice": "The specific ritual/format/catchphrase/motif (1-2 sentences)",
  "stickinessScore": { "simple": N, "unexpected": N, "concrete": N, "credible": N, "emotional": N, "story": N, "total": N },
  "campaignLineTests": { "barTest": bool, "tShirtTest": bool, "parodyTest": bool, "tenYearTest": bool, "categoryEscapeTest": bool, "oppositeTest": bool },
  "creativeTerritory": "The emotional/visual world in 2-3 sentences",
  "extendability": ["How extends to social", "How extends to OOH", "How extends to experiential", ...]
}

CRITICAL RULES:
- You MUST use the assigned Goldenberg template — don't switch to a different one
- You MUST connect to the assigned bisociation domain
- Campaign line MUST be 3-7 words
- If your concept scores below 6 on ANY stickiness criterion, rethink it
- The concept must be OWNABLE — only this brand could say this

Respond with valid JSON only.`;

  const user = `Create a creative concept for a "${goalLabel}" campaign.

## The Human Insight to Build On
${params.selectedInsight}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available.'}${params.briefing?.tonePreference ? `

## Desired Tone
${params.briefing.tonePreference}` : ''}${params.arenaContext ? `

## Associative Inspiration (Are.na)
${params.arenaContext}` : ''}${params.exaContext ? `

## Cross-Industry Patterns (Exa)
${params.exaContext}` : ''}

Create a concept that:
1. Is rooted in the insight above
2. Uses the ${params.goldenbergTemplate.name} template as its structural mechanism
3. Connects to the world of ${params.bisociationDomain.name} (bisociation)
4. Has a campaign line of 3-7 words
5. Has a memorable device that people will talk about`;

  return { system, user };
}

// ─── Strategy Build Prompt (concept-first) ──────────────────────

interface StrategyBuildPromptParams {
  selectedInsight: string;
  selectedConcept: string;
  brandContext: string;
  personaContext: string;
  productContext: string;
  competitorContext: string;
  trendContext: string;
  goalType: string;
  strategicIntent: StrategicIntent;
  personaIds: string[];
  briefing?: CampaignBriefing;
  debateContext?: string;
  effectivenessContext?: string;
  growthContext?: string;
  framingContext?: string;
  eastChecklist?: string;
  cialdiniContext?: string;
  bctContext?: string;
}

/**
 * Builds a full strategy + architecture ON TOP of an approved creative concept.
 * Frameworks SERVE the concept, not the other way around.
 */
export function buildStrategyBuildPrompt(params: StrategyBuildPromptParams): { system: string; user: string } {
  const ratio = intentRatio(params.strategicIntent);
  const goalLabel = GOAL_LABELS[params.goalType] ?? params.goalType;
  const goalInsights = buildGoalInsightsPromptSection(params.goalType);

  const system = `You are a senior strategist building the execution plan for an ALREADY APPROVED creative concept.

THE CONCEPT IS LOCKED. Your job is to make it WORK, not to change it.

## Your Role
You receive:
1. A human insight (approved by the client)
2. A creative concept with campaign line, visual world, and memorable device (approved by the client)
3. Optional debate feedback (from critic, creative director, and persona panel)

Build the strategic infrastructure to bring this concept to life:
- Strategic foundation (intent, messaging, JTBD)
- Campaign architecture (journey phases, touchpoints)
- All persona-specific adaptations

## Key Principle: Frameworks SERVE the Concept
Apply these frameworks to SUPPORT the creative concept:
- Binet & Field: ${ratio.brand}% brand / ${ratio.activation}% activation budget split
- JTBD: Frame the job-to-be-done through the lens of the concept's insight
- Percy & Elliott: Design stimulus→processing→response for each touchpoint${goalInsights}

## Output Format
Return a JSON object with TWO top-level keys:

${EFFIE_STRATEGY_JSON_SCHEMA}

IMPORTANT for the strategy layer:
- campaignTheme MUST match the approved concept's campaign line (do NOT invent a new one)
- humanInsight MUST match the approved insight (do NOT rewrite it)
- creativePlatform, creativeTerritory, memorableDevice MUST match the approved concept
- You CAN add strategic depth to positioningStatement, messagingHierarchy, jtbdFraming, strategicChoices

"architecture": {
  campaignType: Choose the type that best fits,
  journeyPhases: Array of phases, each with:
    id, name, description, orderIndex, goal, kpis,
    personaPhaseData: [{ personaId, personaName, needs, painPoints, mindset, keyQuestion, triggers }],
    touchpoints: [{ channel, contentType, message, role ("primary"|"supporting"),
      personaRelevance: [{ personaId, relevance, messagingAngle }] }]
}

Every touchpoint message must EXPRESS the creative concept.
Use persona IDs from the provided list.

Respond with valid JSON.`;

  const user = `Build the full strategy + architecture for this approved creative concept.

## The Approved Human Insight
${params.selectedInsight}

## The Approved Creative Concept
${params.selectedConcept}

## Campaign Brief
Goal: ${goalLabel}
Strategic Intent: ${intentDescription(params.strategicIntent)}${buildBriefingSection(params.briefing)}${params.debateContext ? `

## Creative Debate Feedback
${params.debateContext}` : ''}

## Brand Context
${params.brandContext}

## Target Personas
${params.personaContext || 'No personas available.'}
Persona IDs: ${JSON.stringify(params.personaIds)}

## Products & Services
${params.productContext || 'No products defined.'}

## Competitive Landscape
${params.competitorContext || 'No competitors defined.'}

## Market Trends
${params.trendContext || 'No trends defined.'}${buildMarketingFrameworkSection({ effectivenessContext: params.effectivenessContext, growthContext: params.growthContext, framingContext: params.framingContext, eastChecklist: params.eastChecklist, cialdiniContext: params.cialdiniContext })}${params.bctContext ? `

## Behavioral Science
${params.bctContext}` : ''}`;

  return { system, user };
}
