/**
 * Seed ExplorationConfig records for all brand asset types.
 * Creates or updates (upsert) configs in the database so they
 * are visible and editable in Settings → Administrator → AI Exploration Configuration.
 *
 * Usage:
 *   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/seed-exploration-configs.ts
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Prompts (match config-resolver.ts system defaults) ──────

const SYSTEM_PROMPT = `You are a senior brand strategist conducting a structured exploration session.
Guide the user through strategic dimensions with thoughtful questions.
Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}`;

const BRAND_ARCHETYPE_SYSTEM_PROMPT = `You are a senior brand strategist specializing in Jungian archetype analysis, conducting a two-phase exploration.

CRITICAL RULE: Always recommend exactly ONE archetype. NEVER suggest a blend, hybrid, dual archetype, or combination of two archetypes. Every brand must commit to a single primary archetype for maximum clarity and consistency.

PHASE 1 — ARCHETYPE DISCOVERY (dimensions 1-2):
Your goal is to help the user discover which single archetype from the 12 Jungian archetypes fits their brand best. Listen carefully to their descriptions of brand personality, emotions, and customer relationships. After the user answers dimension 2 (Core Psychology), you MUST recommend exactly ONE archetype in your feedback — name it (e.g., "Hero", "Sage", "Explorer") and explain WHY it is the best fit based on their answers. If multiple archetypes seem relevant, pick the strongest one and explain why it wins over the alternatives.

The 12 archetypes are: Innocent, Sage, Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator.

PHASE 2 — FIELD CUSTOMIZATION (dimensions 3-5):
Once the single archetype is identified, your goal shifts to helping the user customize the pre-filled reference data for their specific brand context. Each archetype comes with default psychology and positioning data. Help the user adapt these to their unique situation. Voice, tone, and visual expression are managed exclusively in the Brand Personality asset.

Be warm but professional — like a trusted advisor.
Ask ONE question at a time. Keep questions concise.
Reference specific details from previous answers.

{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}`;

const BRAND_ARCHETYPE_FEEDBACK_PROMPT = `Provide brief, constructive feedback (2-3 sentences) on the user's answer.
Dimension: {{dimensionTitle}}
Question asked: {{questionAsked}}
User's answer: {{userAnswer}}

IMPORTANT RULES:
- ALWAYS recommend exactly ONE archetype. NEVER suggest a blend, hybrid, or combination of two archetypes.
- For "Archetype Discovery" or "Core Psychology" dimensions: You MUST name exactly one archetype with reasoning (e.g., "Based on what you've shared, the Hero archetype is the best fit because..."). If multiple seem relevant, choose the strongest one and briefly explain why it wins.
- For later dimensions (Shadow, Action, Positioning): Focus on suggesting specific field customizations for the single chosen archetype. For example: "Your marketing expression could focus on..." or "Consider positioning your archetype as..."

Acknowledge what's strong. If something could be explored further, note it gently.
Reference their specific words. Never ask a follow-up question.
Respond in the same language as the user.`;

const FEEDBACK_PROMPT = `Provide brief, constructive feedback (2-3 sentences) on the user's answer.
Dimension: {{dimensionTitle}}
Question asked: {{questionAsked}}
User's answer: {{userAnswer}}
Acknowledge what's strong. If something could be explored further, note it gently.
Reference their specific words. Never ask a follow-up question.
Respond in the same language as the user.`;

const REPORT_PROMPT = `Generate an analysis report based on the exploration session.
Item: {{itemName}} ({{itemType}})
{{itemDescription}}

Answers per dimension:
{{allAnswers}}

Brand Context:
{{brandContext}}

{{customKnowledge}}

{{assetKnowledge}}

Generate JSON:
{
  "executiveSummary": "2-3 paragraph strategic summary",
  "findings": [{ "title": "...", "description": "..." }],
  "recommendations": ["..."],
  "fieldSuggestions": [{ "field": "...", "label": "...", "suggestedValue": "...", "reason": "..." }]
}
Respond with valid JSON only.`;

// ─── Dimension definitions per subtype ───────────────────────

interface Dimension {
  key: string;
  title: string;
  icon: string;
  question: string;
}

interface FieldSuggestionConfig {
  field: string;
  label: string;
  type: 'text' | 'select' | 'array';
  extractionHint: string;
}

interface AssetTypeConfig {
  subType: string;
  label: string;
  dimensions: Dimension[];
  fieldSuggestionsConfig?: FieldSuggestionConfig[];
}

const ASSET_TYPE_CONFIGS: AssetTypeConfig[] = [
  {
    subType: 'golden-circle',
    label: 'Golden Circle — WHY \u2192 HOW \u2192 WHAT',
    dimensions: [
      { key: 'why', title: 'WHY \u2014 Core Belief', icon: 'Heart', question: 'Why does your organization exist? What is the fundamental belief that drives everything you do?' },
      { key: 'how', title: 'HOW \u2014 Unique Approach', icon: 'Settings', question: 'How do you bring your WHY to life? What processes, values, or methods make your approach unique?' },
      { key: 'what', title: 'WHAT \u2014 Offering', icon: 'Package', question: 'What exactly do you offer? How do your products or services prove your WHY and HOW?' },
      { key: 'coherence', title: 'Inside-Out Coherence', icon: 'Target', question: 'How consistently does your organization communicate from WHY \u2192 HOW \u2192 WHAT? Where are the gaps?' },
    ],
  },
  {
    subType: 'social-relevancy',
    label: 'Social Relevancy — Triple Bottom Line & Brand Activism',
    dimensions: [
      { key: 'impact_foundation', title: 'Impact Foundation', icon: 'Sparkles', question: 'Why does your brand care about social impact? Tell me the story behind your commitment — was there a triggering moment, a founding belief, or an evolving realization?' },
      { key: 'milieu_assessment', title: 'Environmental Impact', icon: 'Leaf', question: "Let's explore your environmental impact. How are sustainability criteria embedded in your procurement? How do you invest revenue in environmental improvement? How do you stimulate environment-improving activities? Be specific about evidence and outcomes." },
      { key: 'mens_assessment', title: 'Impact on People', icon: 'Heart', question: 'How do your products and services contribute to personal wellbeing and a positive lifestyle? Think about both your customers and your employees separately. Where is your impact strongest, and where do you see room for improvement?' },
      { key: 'maatschappij_assessment', title: 'Impact on Society', icon: 'Globe', question: 'How does your brand contribute to positive societal interaction, social harmony, and cohesion? Consider the impact through your products on society, and the impact within your organization on employees.' },
      { key: 'authenticity_test', title: 'Authenticity Test', icon: 'ShieldCheck', question: 'Every brand talks about impact — do you walk the talk? Where is alignment between words and actions strongest? Where are the gaps? What would a critical journalist or skeptical consumer say about your claims?' },
      { key: 'evidence_proof', title: 'Evidence & Proof', icon: 'Award', question: 'What concrete evidence makes your social impact credible? Think about certifications, measurable outcomes, independent validations, and specific initiatives where your values were proven through action.' },
      { key: 'activation_communication', title: 'Activation & Communication', icon: 'TrendingUp', question: 'How do you communicate your social impact without greenwashing? Which UN SDGs align most closely (pick max 3)? What is your concrete annual commitment? Who benefits most from your impact?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the social relevancy positioning in one compelling paragraph' },
      { field: 'frameworkData.impactStatement', label: 'Impact Statement', type: 'text' as const, extractionHint: 'Craft a clear, powerful one-sentence impact statement' },
      { field: 'frameworkData.impactNarrative', label: 'Impact Narrative', type: 'text' as const, extractionHint: 'Write the story behind the commitment to social impact' },
      { field: 'frameworkData.activismLevel', label: 'Activism Level', type: 'text' as const, extractionHint: 'Identify the brand activism level: Silent, Vocal, Leader, or Activist' },
      { field: 'frameworkData.milieu.pillarReflection', label: 'Environment Reflection', type: 'text' as const, extractionHint: 'Reflect on the environmental pillar as a whole' },
      { field: 'frameworkData.mens.pillarReflection', label: 'People Reflection', type: 'text' as const, extractionHint: 'Reflect on the people pillar as a whole' },
      { field: 'frameworkData.maatschappij.pillarReflection', label: 'Society Reflection', type: 'text' as const, extractionHint: 'Reflect on the society pillar as a whole' },
      { field: 'frameworkData.proofPoints', label: 'Proof Points', type: 'array' as const, extractionHint: 'Extract 3-7 concrete proof points as a JSON array of strings' },
      { field: 'frameworkData.certifications', label: 'Certifications', type: 'array' as const, extractionHint: 'Extract relevant certifications (B Corp, ISO 14001, Fair Trade, etc.) as a JSON array of strings' },
      { field: 'frameworkData.antiGreenwashingStatement', label: 'Anti-Greenwashing Statement', type: 'text' as const, extractionHint: 'Write an honest acknowledgment of where the brand falls short' },
      { field: 'frameworkData.sdgAlignment', label: 'SDG Alignment', type: 'array' as const, extractionHint: 'Identify 1-3 most relevant UN SDG numbers (1-17) as a JSON array of numbers' },
      { field: 'frameworkData.communicationPrinciples', label: 'Communication Principles', type: 'array' as const, extractionHint: 'Extract 3-5 principles for impact communication as a JSON array of strings' },
      { field: 'frameworkData.keyStakeholders', label: 'Key Stakeholders', type: 'array' as const, extractionHint: 'Identify the key stakeholder groups who benefit most from the social impact as a JSON array of strings' },
      { field: 'frameworkData.activationChannels', label: 'Activation Channels', type: 'array' as const, extractionHint: 'Suggest 3-5 channels for communicating social impact as a JSON array of strings' },
      { field: 'frameworkData.annualCommitment', label: 'Annual Commitment', type: 'text' as const, extractionHint: 'Craft a concrete, measurable annual commitment' },
    ],
  },
  {
    subType: 'purpose-statement',
    label: 'Purpose Statement \u2014 Bestaansrecht',
    dimensions: [
      { key: 'why', title: 'Waarom \u2014 Bestaansrecht', icon: 'Compass', question: 'Why was your organization founded? What fundamental belief is at the core?' },
      { key: 'how', title: 'Hoe \u2014 Unieke Aanpak', icon: 'Lightbulb', question: "How do you fulfill your purpose in a way that's distinctly yours?" },
      { key: 'impact', title: 'Impact \u2014 Gewenst Effect', icon: 'Rocket', question: 'When your purpose is fully realized, what does the world look like?' },
      { key: 'alignment', title: 'Alignment \u2014 Organisatie & Uitvoering', icon: 'Target', question: 'How well does your current organization reflect your purpose?' },
    ],
  },
  {
    subType: 'brand-essence',
    label: 'Brand Essence Wheel \u2014 Bates/Aaker Model',
    dimensions: [
      { key: 'brand_dna', title: 'Brand DNA', icon: 'Fingerprint', question: 'If your brand were a person in a room full of competitors, what would make people gravitate toward them? What is the single most defining characteristic?' },
      { key: 'value_landscape', title: 'Value Landscape', icon: 'Heart', question: 'Describe the best experience a customer has with your brand. What tangible result do they get, what feeling does it create, and how does it let them express who they are?' },
      { key: 'audience_truth', title: 'Audience Truth', icon: 'Users', question: 'What is the underlying tension, frustration, or deep desire your audience carries \u2014 the thing they might not say out loud but your brand uniquely addresses?' },
      { key: 'evidence_heritage', title: 'Evidence & Heritage', icon: 'ShieldCheck', question: "What concrete facts, achievements, or moments from your brand's history prove that your essence is real \u2014 not aspirational, but lived?" },
      { key: 'differentiation', title: 'Differentiation', icon: 'Target', question: 'Complete this sentence: "Only [your brand] can _____ because _____." What is the single most compelling reason to choose your brand?' },
      { key: 'essence_distillation', title: 'Essence Distillation', icon: 'Diamond', question: 'Based on everything we discussed, distill your brand into 3 words: adjective, adjective, noun. What would that be, and why those words?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Extract a summary of the brand essence' },
      { field: 'frameworkData.essenceStatement', label: 'Essence Statement', type: 'text' as const, extractionHint: 'Distill the brand into 1-3 words (adjective, adjective, noun format)' },
      { field: 'frameworkData.essenceNarrative', label: 'Essence Narrative', type: 'text' as const, extractionHint: 'Write a 2-3 sentence narrative explaining what the essence means and why it matters' },
      { field: 'frameworkData.functionalBenefit', label: 'Functional Benefit', type: 'text' as const, extractionHint: 'Extract the tangible, practical benefit the brand delivers' },
      { field: 'frameworkData.emotionalBenefit', label: 'Emotional Benefit', type: 'text' as const, extractionHint: 'Extract the feeling or emotion the brand creates for customers' },
      { field: 'frameworkData.selfExpressiveBenefit', label: 'Self-Expressive Benefit', type: 'text' as const, extractionHint: 'Extract how the brand helps customers express who they are or want to be' },
      { field: 'frameworkData.discriminator', label: 'Discriminator', type: 'text' as const, extractionHint: 'Extract the single most compelling reason to choose this brand over competitors' },
      { field: 'frameworkData.audienceInsight', label: 'Audience Insight', type: 'text' as const, extractionHint: 'Extract the deep human truth or tension that the brand uniquely addresses' },
      { field: 'frameworkData.proofPoints', label: 'Proof Points', type: 'array' as const, extractionHint: 'Extract 3-5 concrete facts, achievements, or evidence that prove the brand essence is real as a JSON array of strings' },
      { field: 'frameworkData.attributes', label: 'Attributes', type: 'array' as const, extractionHint: 'Extract 3-5 tangible brand characteristics or qualities as a JSON array of strings' },
    ],
  },
  {
    subType: 'brand-promise',
    label: 'Brand Promise \u2014 Keller/Aaker Value Model',
    dimensions: [
      { key: 'promise_core', title: 'Promise Core', icon: 'Shield', question: 'What is the one promise your brand makes to every customer, every time — the commitment they can always count on? Can you distill that into a single sentence that could serve as a tagline?' },
      { key: 'value_layers', title: 'Value Layers', icon: 'Heart', question: 'Describe the best experience a customer has when you deliver on your promise. What tangible result do they get, what feeling does it create, and how does it let them express who they are?' },
      { key: 'audience_need', title: 'Audience & Need', icon: 'Users', question: 'Who is your promise for, and what deeper need does it address — the thing your audience might not say out loud but your brand uniquely solves?' },
      { key: 'onlyness', title: 'Onlyness & Differentiation', icon: 'Target', question: 'Complete this sentence: "Only [your brand] can _____ because _____." What makes your promise impossible to replicate?' },
      { key: 'evidence', title: 'Evidence & Outcomes', icon: 'ShieldCheck', question: 'What concrete proof exists that you deliver on your promise? Name 3-5 specific facts, metrics, or customer outcomes that demonstrate it.' },
    ],
    fieldSuggestionsConfig: [
      { field: 'frameworkData.promiseStatement', label: 'Promise Statement', type: 'text' as const, extractionHint: 'Extract the core brand promise as a clear 1-2 sentence commitment' },
      { field: 'frameworkData.promiseOneLiner', label: 'One-Liner', type: 'text' as const, extractionHint: 'Distill the promise into a single tagline-length sentence' },
      { field: 'frameworkData.functionalValue', label: 'Functional Value', type: 'text' as const, extractionHint: 'Extract the tangible, measurable benefit the promise delivers' },
      { field: 'frameworkData.emotionalValue', label: 'Emotional Value', type: 'text' as const, extractionHint: 'Extract the emotional feeling the promise creates for customers' },
      { field: 'frameworkData.selfExpressiveValue', label: 'Self-Expressive Value', type: 'text' as const, extractionHint: 'Extract how customers express their identity through the brand' },
      { field: 'frameworkData.targetAudience', label: 'Target Audience', type: 'text' as const, extractionHint: 'Extract who the promise is specifically for' },
      { field: 'frameworkData.coreCustomerNeed', label: 'Core Customer Need', type: 'text' as const, extractionHint: 'Extract the deep underlying need the promise addresses' },
      { field: 'frameworkData.differentiator', label: 'Differentiator', type: 'text' as const, extractionHint: 'Extract what makes this promise unique vs competitors' },
      { field: 'frameworkData.onlynessStatement', label: 'Onlyness Statement', type: 'text' as const, extractionHint: 'Format as "Only [brand] can ___ because ___"' },
      { field: 'frameworkData.proofPoints', label: 'Proof Points', type: 'array' as const, extractionHint: 'Extract 3-5 concrete facts or evidence that the promise is real as a JSON array of strings' },
      { field: 'frameworkData.measurableOutcomes', label: 'Measurable Outcomes', type: 'array' as const, extractionHint: 'Extract specific, quantifiable results that demonstrate promise delivery as a JSON array of strings' },
    ],
  },
  {
    subType: 'mission-statement',
    label: 'Mission & Vision \u2014 Collins & Porras / Drucker / Sinek',
    dimensions: [
      { key: 'mission_core', title: 'Mission Core', icon: 'Compass', question: 'What is the fundamental reason your organization exists — beyond making money? If you had to explain your mission to a child in one sentence, what would you say?' },
      { key: 'audience_impact', title: 'Audience & Impact', icon: 'Users', question: 'Who are the people your organization serves, and what specific change do you create in their lives? Describe both the primary audience and the tangible outcome they experience.' },
      { key: 'unique_approach', title: 'Unique Approach', icon: 'Rocket', question: "What makes your approach fundamentally different from others trying to achieve a similar mission? Describe your method, philosophy, or 'secret ingredient' that competitors cannot easily replicate." },
      { key: 'mission_authenticity', title: 'Mission Authenticity', icon: 'Shield', question: 'How does your current daily work reflect your stated mission? Where is the alignment strongest, and where are the biggest gaps between what you say and what you do?' },
      { key: 'future_vision', title: 'Future Vision', icon: 'Eye', question: 'Close your eyes and imagine your organization has fully succeeded — 10 years from now. What does the world look like? Paint a vivid, concrete picture of this future state.' },
      { key: 'bold_aspiration', title: 'Scale of Ambition', icon: 'Mountain', question: 'What is the boldest, most audacious goal your organization could set — one that makes you slightly uncomfortable because of its scale? Think BHAG: Big Hairy Audacious Goal. What would you attempt if you knew you could not fail?' },
      { key: 'success_signals', title: 'Success Signals', icon: 'BarChart2', question: 'How would you know your vision is becoming reality? What are the 3-5 concrete, measurable indicators you would track? Think about impact on customers, employees, industry, and society.' },
      { key: 'mission_vision_bridge', title: 'Mission-Vision Bridge', icon: 'Map', question: 'Your mission describes what you do today; your vision describes where you are going. What is the creative tension between these two? What key milestones or transformations need to happen to bridge the gap?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'frameworkData.missionStatement', label: 'Mission Statement', type: 'text' as const, extractionHint: 'Extract the core mission as a clear 1-3 sentence statement of purpose' },
      { field: 'frameworkData.missionOneLiner', label: 'Mission One-Liner', type: 'text' as const, extractionHint: 'Distill the mission into one sentence that fits on a T-shirt (Drucker test)' },
      { field: 'frameworkData.forWhom', label: 'For Whom', type: 'text' as const, extractionHint: 'Extract the primary audience or beneficiaries the mission serves' },
      { field: 'frameworkData.whatWeDo', label: 'What We Do', type: 'text' as const, extractionHint: 'Extract the primary activity or service the organization provides' },
      { field: 'frameworkData.howWeDoIt', label: 'How We Do It', type: 'text' as const, extractionHint: 'Extract the unique approach, methodology, or differentiating philosophy' },
      { field: 'frameworkData.visionStatement', label: 'Vision Statement', type: 'text' as const, extractionHint: 'Extract the aspirational future state the organization is working toward (1-3 sentences)' },
      { field: 'frameworkData.timeHorizon', label: 'Time Horizon', type: 'text' as const, extractionHint: 'Extract the timeframe for the vision (e.g., 3 years, 5 years, 10 years, 15+ years, Aspirational)' },
      { field: 'frameworkData.boldAspiration', label: 'Bold Aspiration (BHAG)', type: 'text' as const, extractionHint: 'Extract the Big Hairy Audacious Goal (Collins & Porras) that stretches beyond current capability' },
      { field: 'frameworkData.desiredFutureState', label: 'Desired Future State', type: 'text' as const, extractionHint: 'Extract the vivid description of success when the vision is fully achieved' },
      { field: 'frameworkData.successIndicators', label: 'Success Indicators', type: 'array' as const, extractionHint: 'Extract 3-5 concrete, measurable indicators that signal the vision is becoming reality as a JSON array of strings' },
      { field: 'frameworkData.stakeholderBenefit', label: 'Stakeholder Benefit', type: 'text' as const, extractionHint: 'Extract who benefits from the vision and how (employees, customers, partners, society)' },
      { field: 'frameworkData.impactGoal', label: 'Impact Goal', type: 'text' as const, extractionHint: 'Extract the measurable impact the mission aims to achieve today' },
      { field: 'frameworkData.valuesAlignment', label: 'Values Alignment', type: 'text' as const, extractionHint: 'Extract how the mission and vision reinforce the organization\u2019s core values' },
      { field: 'frameworkData.missionVisionTension', label: 'Mission-Vision Tension', type: 'text' as const, extractionHint: 'Extract the creative tension between present mission and future vision, including key milestones' },
    ],
  },
  {
    subType: 'brand-archetype',
    label: 'Brand Archetype — Jung / Mark & Pearson',
    dimensions: [
      { key: 'archetype_discovery', title: 'Archetype Discovery', icon: 'Crown', question: 'Tell me about your brand\'s personality. What emotions do you want to evoke in your customers? If your brand were a character in a story, what role would it play — the hero, the wise guide, the rebel, the caregiver, the explorer? What personality feels most natural?' },
      { key: 'core_psychology', title: 'Core Psychology', icon: 'Heart', question: 'What deep desire does your brand fulfill for customers? What fear or problem does it help them overcome? Think about the fundamental human need your brand addresses — and what unique gift or talent it brings to do so.' },
      { key: 'shadow_risks', title: 'Shadow & Guardrails', icon: 'Moon', question: 'Every archetype has a shadow side — when taken too far, its strengths become weaknesses. What does that look like for your brand? For example, a Caregiver can become a martyr, a Hero can become arrogant. How do you guard against these patterns?' },
      { key: 'archetype_in_action', title: 'Archetype in Action', icon: 'Activity', question: 'How does your archetype come alive in practice? Describe how it manifests in your marketing campaigns, customer experience, content strategy, and storytelling approach. Give me a specific example where your archetype was clearly visible.' },
      { key: 'competitive_positioning', title: 'Competitive Positioning', icon: 'Target', question: 'Which brands in your industry share a similar archetype? How do you differentiate within that archetype territory? What positioning approach works best for your brand — similarity, aspiration, guidance, or inspiration?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'frameworkData.primaryArchetype', label: 'Brand Archetype', type: 'select' as const, extractionHint: 'Identify the single best-fitting Jungian archetype for this brand. MUST be exactly one of these lowercase IDs: innocent, everyman, hero, outlaw, explorer, creator, ruler, magician, lover, caregiver, jester, sage. Choose exactly ONE archetype. NEVER suggest a blend, hybrid, or combination of two archetypes.' },
      { field: 'frameworkData.subArchetype', label: 'Sub-Archetype', type: 'text' as const, extractionHint: 'Identify the specific variant within the primary archetype (e.g., "Rescuer" for Hero)' },
      { field: 'frameworkData.coreDesire', label: 'Core Desire', type: 'text' as const, extractionHint: 'Extract the core desire this brand fulfills for customers' },
      { field: 'frameworkData.coreFear', label: 'Core Fear', type: 'text' as const, extractionHint: 'Extract the core fear this brand helps customers overcome' },
      { field: 'frameworkData.brandGoal', label: 'Brand Goal', type: 'text' as const, extractionHint: 'Extract the overarching goal driven by the archetype' },
      { field: 'frameworkData.strategy', label: 'Strategy', type: 'text' as const, extractionHint: 'Extract how the archetype drives the brand strategy' },
      { field: 'frameworkData.giftTalent', label: 'Gift / Talent', type: 'text' as const, extractionHint: 'Extract the unique gift or talent the brand brings' },
      { field: 'frameworkData.shadowWeakness', label: 'Shadow Weakness', type: 'text' as const, extractionHint: 'Extract the shadow side and potential weakness of the archetype as applied to this brand' },
      { field: 'frameworkData.archetypeInAction', label: 'Archetype in Action', type: 'text' as const, extractionHint: 'Describe how the archetype manifests across the brand experience' },
      { field: 'frameworkData.marketingExpression', label: 'Marketing Expression', type: 'text' as const, extractionHint: 'Describe how the archetype shapes the brand marketing approach and campaigns' },
      { field: 'frameworkData.competitiveLandscape', label: 'Competitive Landscape', type: 'text' as const, extractionHint: 'Analyze the competitive landscape from an archetype perspective' },
      { field: 'frameworkData.brandExamples', label: 'Brand Examples', type: 'array' as const, extractionHint: 'List 3-5 reference brands that share this archetype as a JSON array of strings' },
    ],
  },
  {
    subType: 'transformative-goals',
    label: 'Transformative Goals \u2014 MTP / BHAG / Moonshot',
    dimensions: [
      { key: 'origin_belief', title: 'MTP Foundation', icon: 'Sparkles', question: 'What massive, audacious change does your brand want to see in the world? Think beyond products \u2014 what is your Massive Transformative Purpose (MTP) that would make the world fundamentally better?' },
      { key: 'future_vision', title: 'Future Vision', icon: 'Eye', question: 'If your brand\u2019s mission succeeds completely, what does the world look like in 10-15 years? Paint a vivid picture of the future state you\u2019re working toward.' },
      { key: 'impact_scope', title: 'Impact Scope', icon: 'Globe', question: 'Which impact domains are most relevant for your brand? Consider People (health, education, inclusion), Planet (environment, sustainability, biodiversity), and Prosperity (economic empowerment, innovation, fair systems). Where can you make the biggest difference?' },
      { key: 'measurable_commitment', title: 'Measurable Commitments', icon: 'Target', question: 'What concrete, time-bound commitments can you make? Think of specific goals with deadlines and measurable targets \u2014 for example: "Reduce carbon footprint by 50% by 2030" or "Train 100,000 people in digital skills by 2028".' },
      { key: 'theory_of_change', title: 'Theory of Change', icon: 'Map', question: 'How does your brand\u2019s daily activity lead to the transformative impact you described? Walk me through the chain: what you do \u2192 immediate effect \u2192 medium-term change \u2192 long-term transformation.' },
      { key: 'authenticity_alignment', title: 'Authenticity Alignment', icon: 'Shield', question: 'How authentic are these goals given your current brand DNA, operations, and history? Where is there strong alignment, and where might stakeholders see a gap between ambition and reality?' },
      { key: 'activation_strategy', title: 'Activation Strategy', icon: 'Rocket', question: 'How will these transformative goals be integrated into your brand strategy, communication themes, campaigns, and internal culture? Who are the key stakeholders, and what role does each play?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the transformative goals in one compelling paragraph' },
      { field: 'frameworkData.massiveTransformativePurpose', label: 'Massive Transformative Purpose', type: 'text' as const, extractionHint: 'Craft a bold MTP statement \u2014 a single sentence describing the massive change the brand wants to create' },
      { field: 'frameworkData.mtpNarrative', label: 'MTP Narrative', type: 'text' as const, extractionHint: 'Write a 2-3 sentence narrative expanding on the MTP: why it matters, what drives it, and why this brand is uniquely positioned' },
      { field: 'frameworkData.goals[0].title', label: 'Goal 1 Title', type: 'text' as const, extractionHint: 'Extract the first transformative goal title (short, action-oriented)' },
      { field: 'frameworkData.goals[0].description', label: 'Goal 1 Description', type: 'text' as const, extractionHint: 'Describe the first goal in 1-2 sentences with specific impact' },
      { field: 'frameworkData.goals[0].impactDomain', label: 'Goal 1 Domain', type: 'text' as const, extractionHint: 'Assign impact domain: PEOPLE, PLANET, or PROSPERITY' },
      { field: 'frameworkData.goals[0].timeframe', label: 'Goal 1 Timeframe', type: 'text' as const, extractionHint: 'Set a concrete timeframe (e.g. "By 2030")' },
      { field: 'frameworkData.goals[0].measurableCommitment', label: 'Goal 1 Measurable Target', type: 'text' as const, extractionHint: 'Extract a concrete, measurable commitment (e.g. "Reduce X by Y% by 2030")' },
      { field: 'frameworkData.goals[0].theoryOfChange', label: 'Goal 1 Theory of Change', type: 'text' as const, extractionHint: 'Describe how daily brand activities lead to this goal\'s impact (cause → effect chain)' },
      { field: 'frameworkData.goals[1].title', label: 'Goal 2 Title', type: 'text' as const, extractionHint: 'Extract the second transformative goal title' },
      { field: 'frameworkData.goals[1].description', label: 'Goal 2 Description', type: 'text' as const, extractionHint: 'Describe the second goal in 1-2 sentences' },
      { field: 'frameworkData.goals[1].impactDomain', label: 'Goal 2 Domain', type: 'text' as const, extractionHint: 'Assign impact domain: PEOPLE, PLANET, or PROSPERITY' },
      { field: 'frameworkData.goals[1].measurableCommitment', label: 'Goal 2 Measurable Target', type: 'text' as const, extractionHint: 'Extract a concrete, measurable commitment for goal 2' },
      { field: 'frameworkData.goals[2].title', label: 'Goal 3 Title', type: 'text' as const, extractionHint: 'Extract the third transformative goal title' },
      { field: 'frameworkData.goals[2].description', label: 'Goal 3 Description', type: 'text' as const, extractionHint: 'Describe the third goal in 1-2 sentences' },
      { field: 'frameworkData.brandIntegration.positioningLink', label: 'Positioning Link', type: 'text' as const, extractionHint: 'Describe how these goals connect to the brand\'s market positioning and competitive differentiation' },
      { field: 'frameworkData.brandIntegration.communicationThemes', label: 'Communication Themes', type: 'array' as const, extractionHint: 'Extract 3-5 communication themes as a JSON array of strings' },
      { field: 'frameworkData.brandIntegration.campaignDirections', label: 'Campaign Directions', type: 'array' as const, extractionHint: 'Suggest 2-4 campaign directions as a JSON array of strings' },
      { field: 'frameworkData.brandIntegration.internalActivation', label: 'Internal Activation', type: 'text' as const, extractionHint: 'Describe how these goals should be activated internally (culture, operations, employee engagement)' },
    ],
  },
  {
    subType: 'brand-personality',
    label: 'Brand Personality \u2014 Character & Voice',
    dimensions: [
      { key: 'traits', title: 'Core Traits', icon: 'User', question: 'If your brand were a person at a dinner party, how would other guests describe them? Name 3-5 key personality traits.' },
      { key: 'voice', title: 'Voice & Tone', icon: 'MessageCircle', question: 'How does your brand speak? What words would it use \u2014 and never use? What\u2019s the tone in different situations?' },
      { key: 'relationships', title: 'Relationship Style', icon: 'Heart', question: 'What kind of relationship does your brand build with people? A trusted advisor? A fun friend? A wise mentor?' },
      { key: 'boundaries', title: 'Personality Boundaries', icon: 'AlertCircle', question: 'What is your brand personality NOT? What traits would feel inauthentic or off-brand?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the brand personality in one compelling paragraph' },
      { field: 'frameworkData.primaryDimension', label: 'Primary Dimension', type: 'text' as const, extractionHint: 'Identify the dominant Aaker dimension (sincerity, excitement, competence, sophistication, or ruggedness)' },
      { field: 'frameworkData.dimensionScores', label: 'Dimension Scores', type: 'text' as const, extractionHint: 'Score each Aaker dimension 1-5 based on the exploration answers. Return as JSON: {"sincerity": 3, "excitement": 4, "competence": 5, "sophistication": 2, "ruggedness": 1}' },
      { field: 'frameworkData.personalityTraits', label: 'Personality Traits', type: 'text' as const, extractionHint: 'Extract 3-5 personality traits with name, description, weAreThis, and butNeverThat for each' },
      // Spectrum sliders — individual numeric fields (1-7 scale)
      { field: 'frameworkData.spectrumSliders.friendlyFormal', label: 'Spectrum: Friendly vs Formal', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Friendly/Approachable/Casual, 7 = Corporate/Formal/Authoritative' },
      { field: 'frameworkData.spectrumSliders.energeticThoughtful', label: 'Spectrum: Energetic vs Thoughtful', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = High-Energy/Enthusiastic/Bold, 7 = Thoughtful/Careful/Reflective' },
      { field: 'frameworkData.spectrumSliders.modernTraditional', label: 'Spectrum: Modern vs Traditional', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Modern/Contemporary/Progressive, 7 = Traditional/Classic/Heritage' },
      { field: 'frameworkData.spectrumSliders.innovativeProven', label: 'Spectrum: Innovative vs Proven', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Cutting Edge/Innovative/Disruptive, 7 = Established/Proven/Reliable' },
      { field: 'frameworkData.spectrumSliders.playfulSerious', label: 'Spectrum: Playful vs Serious', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Fun/Playful/Lighthearted, 7 = Serious/Professional/Business-like' },
      { field: 'frameworkData.spectrumSliders.inclusiveExclusive', label: 'Spectrum: Inclusive vs Exclusive', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Inclusive/Welcoming/Mass appeal, 7 = Exclusive/Selective/Limited access' },
      { field: 'frameworkData.spectrumSliders.boldReserved', label: 'Spectrum: Bold vs Reserved', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Bold/Daring/Provocative, 7 = Reserved/Understated/Subtle' },
      // Tone dimensions — individual numeric fields (1-7 scale, NN/g model)
      { field: 'frameworkData.toneDimensions.formalCasual', label: 'Tone: Formal vs Casual', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Formal/Structured/Professional, 7 = Casual/Conversational/Relaxed' },
      { field: 'frameworkData.toneDimensions.seriousFunny', label: 'Tone: Serious vs Funny', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Serious/Straightforward, 7 = Funny/Intentionally humorous' },
      { field: 'frameworkData.toneDimensions.respectfulIrreverent', label: 'Tone: Respectful vs Irreverent', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Respectful/Dignified, 7 = Irreverent/Playful/Unconventional' },
      { field: 'frameworkData.toneDimensions.matterOfFactEnthusiastic', label: 'Tone: Matter-of-fact vs Enthusiastic', type: 'text' as const, extractionHint: 'Return a single number 1-7. 1 = Matter-of-fact/Neutral/Dry, 7 = Enthusiastic/Energetic/Emotionally engaged' },
      { field: 'frameworkData.brandVoiceDescription', label: 'Brand Voice', type: 'text' as const, extractionHint: 'Describe the overall brand voice in 2-3 sentences' },
      { field: 'frameworkData.wordsWeUse', label: 'Words We Use', type: 'array' as const, extractionHint: 'Extract 5-10 words or phrases the brand should use as a JSON array of strings' },
      { field: 'frameworkData.wordsWeAvoid', label: 'Words We Avoid', type: 'array' as const, extractionHint: 'Extract 5-10 words or phrases the brand should avoid as a JSON array of strings' },
      { field: 'frameworkData.writingSample', label: 'Writing Sample', type: 'text' as const, extractionHint: 'Create a writing sample that demonstrates the brand voice' },
      // Channel tones — individual string fields per communication channel
      { field: 'frameworkData.channelTones.website', label: 'Channel: Website', type: 'text' as const, extractionHint: 'Describe the brand tone for the website in 1-2 sentences (e.g. "Core voice, slightly formal, authoritative")' },
      { field: 'frameworkData.channelTones.socialMedia', label: 'Channel: Social Media', type: 'text' as const, extractionHint: 'Describe the brand tone for social media in 1-2 sentences (e.g. "More casual, personality-forward, engaging")' },
      { field: 'frameworkData.channelTones.customerSupport', label: 'Channel: Customer Support', type: 'text' as const, extractionHint: 'Describe the brand tone for customer support in 1-2 sentences (e.g. "Empathetic, solution-focused, patient")' },
      { field: 'frameworkData.channelTones.email', label: 'Channel: Email', type: 'text' as const, extractionHint: 'Describe the brand tone for email marketing in 1-2 sentences (e.g. "Warm, personal, value-focused")' },
      { field: 'frameworkData.channelTones.crisis', label: 'Channel: Crisis', type: 'text' as const, extractionHint: 'Describe the brand tone for crisis communication in 1-2 sentences (e.g. "Transparent, serious, accountable")' },
      { field: 'frameworkData.colorDirection', label: 'Color Direction', type: 'text' as const, extractionHint: 'Describe the color direction that matches the brand personality' },
      { field: 'frameworkData.typographyDirection', label: 'Typography Direction', type: 'text' as const, extractionHint: 'Describe the typography style that matches the brand personality' },
      { field: 'frameworkData.imageryDirection', label: 'Imagery Direction', type: 'text' as const, extractionHint: 'Describe the imagery style that represents the brand personality' },
    ],
  },
  {
    subType: 'brand-story',
    label: 'Brand Story \u2014 Origin & Narrative',
    dimensions: [
      { key: 'origin', title: 'Origin Story', icon: 'BookOpen', question: 'How did your brand begin? What problem or moment sparked its creation?' },
      { key: 'struggle', title: 'Challenge & Struggle', icon: 'Mountain', question: 'What challenges has your brand overcome? What makes the journey compelling?' },
      { key: 'turning_point', title: 'Turning Point', icon: 'Star', question: 'What was the defining moment that shaped who your brand is today?' },
      { key: 'future_chapter', title: 'The Next Chapter', icon: 'ArrowRight', question: 'What is the next chapter of your brand story? Where is the narrative heading?' },
    ],
  },
  {
    subType: 'brandhouse-values',
    label: 'Core Values \u2014 BrandHouse Model (Roots, Wings, Fire)',
    dimensions: [
      { key: 'value_inventory', title: 'Value Inventory', icon: 'List', question: 'Let\u2019s start by inventorying your values. If you asked 4-6 people across your organization "what do we stand for?", what words would come up? List as many values as you can think of \u2014 we\u2019ll cluster and prioritize them next.' },
      { key: 'roots_foundation', title: 'Roots \u2014 Foundation', icon: 'Anchor', question: 'Looking at your inventory, which values are your Roots? These are the foundational principles already embedded in your DNA \u2014 proven through daily actions, not aspirational. For each, describe concrete evidence: how would a new employee see this value in action on their first day?' },
      { key: 'wings_direction', title: 'Wings \u2014 Direction', icon: 'Compass', question: 'Which values are your Wings? These give direction to the movement your brand wants to make. They require active effort and investment. For each, explain: what concrete steps are you taking to grow into this value? What would success look like in 2 years?' },
      { key: 'fire_distinction', title: 'Fire \u2014 Distinction', icon: 'Flame', question: 'Now identify your Fire \u2014 the one value that most distinctively describes how your organization does things. If a competitor adopted all your other values, this is the one they could never replicate authentically. What is it, and why is it uniquely yours?' },
      { key: 'validation_test', title: 'Validation & Selection', icon: 'ShieldCheck', question: 'Let\u2019s validate your value set. For each value, apply two tests: (1) Is it a prerequisite that every competitor also has, or is it truly distinguishing? (2) Would everyone in your organization agree this characterizes your brand? Any value that fails both tests should be reconsidered.' },
      { key: 'tension_balance', title: 'Value Tension', icon: 'Scale', question: 'Great value sets have productive tension between them. How do your Roots, Wings, and Fire create a healthy pull in different directions? For example, does your root of reliability ever clash with your wing of innovation? How do you navigate that tension?' },
    ],
    fieldSuggestionsConfig: [
      { field: 'description', label: 'Description', type: 'text' as const, extractionHint: 'Summarize the brand\u2019s core value positioning in one compelling paragraph' },
      { field: 'frameworkData.anchorValue1.name', label: 'Root Value 1 (Name)', type: 'text' as const, extractionHint: 'Extract the name of the first root/anchor value identified in the exploration' },
      { field: 'frameworkData.anchorValue1.description', label: 'Root Value 1 (Description)', type: 'text' as const, extractionHint: 'Describe how this root value is proven through daily actions with concrete evidence' },
      { field: 'frameworkData.anchorValue2.name', label: 'Root Value 2 (Name)', type: 'text' as const, extractionHint: 'Extract the name of the second root/anchor value' },
      { field: 'frameworkData.anchorValue2.description', label: 'Root Value 2 (Description)', type: 'text' as const, extractionHint: 'Describe how this root value is proven through daily actions with concrete evidence' },
      { field: 'frameworkData.aspirationValue1.name', label: 'Wing Value 1 (Name)', type: 'text' as const, extractionHint: 'Extract the name of the first wing/aspiration value' },
      { field: 'frameworkData.aspirationValue1.description', label: 'Wing Value 1 (Description)', type: 'text' as const, extractionHint: 'Describe the aspiration, concrete steps being taken, and what success looks like' },
      { field: 'frameworkData.aspirationValue2.name', label: 'Wing Value 2 (Name)', type: 'text' as const, extractionHint: 'Extract the name of the second wing/aspiration value' },
      { field: 'frameworkData.aspirationValue2.description', label: 'Wing Value 2 (Description)', type: 'text' as const, extractionHint: 'Describe the aspiration, concrete steps being taken, and what success looks like' },
      { field: 'frameworkData.ownValue.name', label: 'Fire / Own Value (Name)', type: 'text' as const, extractionHint: 'Extract the name of the fire/own value \u2014 the most distinguishing characteristic' },
      { field: 'frameworkData.ownValue.description', label: 'Fire / Own Value (Description)', type: 'text' as const, extractionHint: 'Explain why this value is uniquely theirs and could not be authentically replicated by competitors' },
      { field: 'frameworkData.valueTension', label: 'Value Tension', type: 'text' as const, extractionHint: 'Describe the productive tension between roots, wings, and fire and how the brand navigates it' },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────

async function main() {
  // 1. Get the first workspace
  const workspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!workspace) {
    console.error('No workspace found in the database. Run the main seed first.');
    process.exit(1);
  }

  console.log(`Using workspace: "${workspace.name}" (${workspace.id})`);
  console.log(`Seeding ${ASSET_TYPE_CONFIGS.length} brand asset exploration configs...\n`);

  let created = 0;
  let updated = 0;

  for (const cfg of ASSET_TYPE_CONFIGS) {
    // Check if config already exists
    const existing = await prisma.explorationConfig.findUnique({
      where: {
        workspaceId_itemType_itemSubType: {
          workspaceId: workspace.id,
          itemType: 'brand_asset',
          itemSubType: cfg.subType,
        },
      },
    });

    const isArchetype = cfg.subType === 'brand-archetype';
    const data = {
      itemType: 'brand_asset',
      itemSubType: cfg.subType,
      label: cfg.label,
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.4,
      maxTokens: 2048,
      isActive: true,
      systemPrompt: isArchetype ? BRAND_ARCHETYPE_SYSTEM_PROMPT : SYSTEM_PROMPT,
      feedbackPrompt: isArchetype ? BRAND_ARCHETYPE_FEEDBACK_PROMPT : FEEDBACK_PROMPT,
      reportPrompt: REPORT_PROMPT,
      dimensions: cfg.dimensions as unknown as Prisma.InputJsonValue,
      fieldSuggestionsConfig: cfg.fieldSuggestionsConfig
        ? (cfg.fieldSuggestionsConfig as unknown as Prisma.InputJsonValue)
        : undefined,
      contextSources: ['brand_asset', 'product'],
    };

    if (existing) {
      await prisma.explorationConfig.update({
        where: { id: existing.id },
        data,
      });
      console.log(`  Updated: ${cfg.label} (${cfg.subType})`);
      updated++;
    } else {
      await prisma.explorationConfig.create({
        data: {
          ...data,
          workspaceId: workspace.id,
        },
      });
      console.log(`  Created: ${cfg.label} (${cfg.subType})`);
      created++;
    }
  }

  // Also seed a base persona config if it doesn't exist
  const personaExists = await prisma.explorationConfig.findFirst({
    where: { workspaceId: workspace.id, itemType: 'persona', itemSubType: null },
  });

  if (!personaExists) {
    await prisma.explorationConfig.create({
      data: {
        workspaceId: workspace.id,
        itemType: 'persona',
        itemSubType: null,
        label: 'Persona \u2014 Base Exploration',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.4,
        maxTokens: 2048,
        isActive: true,
        systemPrompt: SYSTEM_PROMPT,
        feedbackPrompt: FEEDBACK_PROMPT,
        reportPrompt: REPORT_PROMPT,
        dimensions: [
          { key: 'demographics', title: 'Demographics Profile', icon: 'Users', question: "Can you tell me more about this persona's background \u2014 age range, location, education, professional context?" },
          { key: 'goals_motivations', title: 'Goals & Motivations', icon: 'TrendingUp', question: "What are this persona's primary objectives \u2014 both professional and personal?" },
          { key: 'challenges_frustrations', title: 'Challenges & Pain Points', icon: 'Heart', question: 'What are the main obstacles this persona faces? What pain points do they experience?' },
          { key: 'value_proposition', title: 'Value Alignment', icon: 'Zap', question: "How does your brand's offering connect with this persona's needs?" },
        ],
        contextSources: ['brand_asset', 'product'],
      },
    });
    console.log(`  Created: Persona \u2014 Base Exploration (persona/null)`);
    created++;
  } else {
    console.log(`  Skipped: Persona base config already exists`);
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}`);
  console.log('Configs are now visible in Settings \u2192 Administrator \u2192 AI Exploration Configuration.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
