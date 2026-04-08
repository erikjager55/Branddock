/**
 * Export all Goed-Bouw brand foundation items to a comprehensive markdown document.
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/export-goedbouw-brand.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: 'postgresql://erikjager:@localhost:5432/branddock' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WORKSPACE_ID = 'cmneamaqw000ig3ms1eam4ga0';

// ── Helpers ─────────────────────────────────────────────────

function s(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
}

function arr(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

function obj(val: unknown): Record<string, unknown> {
  return val && typeof val === 'object' && !Array.isArray(val) ? val as Record<string, unknown> : {};
}

// ── Framework Formatters ────────────────────────────────────

function formatPurposeWheel(d: Record<string, unknown>): string {
  const lines: string[] = [];
  if (d.statement) lines.push(`**Purpose Statement:** ${s(d.statement)}`);
  if (d.impactType) lines.push(`**Impact Type:** ${s(d.impactType)}`);
  if (d.impactDescription) lines.push(`**Impact:** ${s(d.impactDescription)}`);
  if (d.mechanismCategory) lines.push(`**Mechanism Category:** ${s(d.mechanismCategory)}`);
  if (d.mechanism) lines.push(`**Mechanism:** ${s(d.mechanism)}`);
  if (d.pressureTest) lines.push(`**Pressure Test:** ${s(d.pressureTest)}`);
  return lines.join('\n\n');
}

function formatGoldenCircle(d: Record<string, unknown>): string {
  const lines: string[] = [];
  const why = obj(d.why);
  const how = obj(d.how);
  const what = obj(d.what);

  if (why.statement) {
    lines.push(`#### WHY\n**Statement:** ${s(why.statement)}`);
    if (why.details) lines.push(`**Details:** ${s(why.details)}`);
  }
  if (how.statement) {
    lines.push(`#### HOW\n**Statement:** ${s(how.statement)}`);
    if (how.details) lines.push(`**Details:** ${s(how.details)}`);
  }
  if (what.statement) {
    lines.push(`#### WHAT\n**Statement:** ${s(what.statement)}`);
    if (what.details) lines.push(`**Details:** ${s(what.details)}`);
  }
  return lines.join('\n\n');
}

function formatBrandEssence(d: Record<string, unknown>): string {
  const lines: string[] = [];
  if (d.essenceStatement) lines.push(`**Essence:** ${s(d.essenceStatement)}`);
  if (d.essenceNarrative) lines.push(`**Narrative:** ${s(d.essenceNarrative)}`);
  if (d.functionalBenefit) lines.push(`**Functional Benefit:** ${s(d.functionalBenefit)}`);
  if (d.emotionalBenefit) lines.push(`**Emotional Benefit:** ${s(d.emotionalBenefit)}`);
  if (d.selfExpressiveBenefit) lines.push(`**Self-Expressive Benefit:** ${s(d.selfExpressiveBenefit)}`);
  if (d.discriminator) lines.push(`**Discriminator:** ${s(d.discriminator)}`);
  if (d.audienceInsight) lines.push(`**Audience Insight:** ${s(d.audienceInsight)}`);
  const pp = arr(d.proofPoints).filter(Boolean);
  if (pp.length > 0) lines.push(`**Proof Points:**\n${pp.map(p => `- ${s(p)}`).join('\n')}`);
  const attrs = arr(d.attributes).filter(Boolean);
  if (attrs.length > 0) lines.push(`**Attributes:** ${attrs.map(a => s(a)).join(', ')}`);
  return lines.join('\n\n');
}

function formatBrandPromise(d: Record<string, unknown>): string {
  const lines: string[] = [];
  if (d.promiseStatement) lines.push(`**Promise:** ${s(d.promiseStatement)}`);
  if (d.promiseOneLiner) lines.push(`**One-liner:** ${s(d.promiseOneLiner)}`);
  if (d.functionalValue) lines.push(`**Functional Value:** ${s(d.functionalValue)}`);
  if (d.emotionalValue) lines.push(`**Emotional Value:** ${s(d.emotionalValue)}`);
  if (d.selfExpressiveValue) lines.push(`**Self-Expressive Value:** ${s(d.selfExpressiveValue)}`);
  if (d.targetAudience) lines.push(`**Target Audience:** ${s(d.targetAudience)}`);
  if (d.coreCustomerNeed) lines.push(`**Core Customer Need:** ${s(d.coreCustomerNeed)}`);
  if (d.differentiator) lines.push(`**Differentiator:** ${s(d.differentiator)}`);
  if (d.onlynessStatement) lines.push(`**Onlyness Statement:** ${s(d.onlynessStatement)}`);
  const pp = arr(d.proofPoints).filter(Boolean);
  if (pp.length > 0) lines.push(`**Proof Points:**\n${pp.map(p => `- ${s(p)}`).join('\n')}`);
  const mo = arr(d.measurableOutcomes).filter(Boolean);
  if (mo.length > 0) lines.push(`**Measurable Outcomes:**\n${mo.map(o => `- ${s(o)}`).join('\n')}`);
  return lines.join('\n\n');
}

function formatMissionVision(d: Record<string, unknown>): string {
  const lines: string[] = [];

  lines.push('#### Missie');
  if (d.missionOneLiner) lines.push(`**One-liner:** ${s(d.missionOneLiner)}`);
  if (d.missionStatement) lines.push(`**Mission Statement:** ${s(d.missionStatement)}`);
  if (d.forWhom) lines.push(`**For Whom:** ${s(d.forWhom)}`);
  if (d.whatWeDo) lines.push(`**What We Do:** ${s(d.whatWeDo)}`);
  if (d.howWeDoIt) lines.push(`**How We Do It:** ${s(d.howWeDoIt)}`);
  if (d.impactGoal) lines.push(`**Impact Goal:** ${s(d.impactGoal)}`);

  lines.push('\n#### Visie');
  if (d.visionStatement) lines.push(`**Vision Statement:** ${s(d.visionStatement)}`);
  if (d.timeHorizon) lines.push(`**Time Horizon:** ${s(d.timeHorizon)}`);
  if (d.boldAspiration) lines.push(`**Bold Aspiration (BHAG):** ${s(d.boldAspiration)}`);
  if (d.desiredFutureState) lines.push(`**Desired Future State:** ${s(d.desiredFutureState)}`);

  const indicators = arr(d.successIndicators).filter(Boolean);
  if (indicators.length > 0) lines.push(`**Success Indicators:**\n${indicators.map(i => `- ${s(i)}`).join('\n')}`);
  if (d.stakeholderBenefit) lines.push(`**Stakeholder Benefit:** ${s(d.stakeholderBenefit)}`);
  if (d.valuesAlignment) lines.push(`**Values Alignment:** ${s(d.valuesAlignment)}`);
  if (d.missionVisionTension) lines.push(`**Mission-Vision Tension:** ${s(d.missionVisionTension)}`);
  return lines.join('\n\n');
}

function formatBrandArchetype(d: Record<string, unknown>): string {
  const lines: string[] = [];

  if (d.primaryArchetype) {
    let identity = `**Archetype:** ${s(d.primaryArchetype)}`;
    if (d.subArchetype) identity += ` — Sub-archetype: ${s(d.subArchetype)}`;
    lines.push(identity);
  }

  lines.push('#### Core Psychology');
  if (d.coreDesire) lines.push(`**Core Desire:** ${s(d.coreDesire)}`);
  if (d.coreFear) lines.push(`**Core Fear:** ${s(d.coreFear)}`);
  if (d.brandGoal) lines.push(`**Brand Goal:** ${s(d.brandGoal)}`);
  if (d.strategy) lines.push(`**Strategy:** ${s(d.strategy)}`);
  if (d.giftTalent) lines.push(`**Gift/Talent:** ${s(d.giftTalent)}`);
  if (d.shadowWeakness) lines.push(`**Shadow/Weakness:** ${s(d.shadowWeakness)}`);

  lines.push('#### Archetype in Action');
  if (d.archetypeInAction) lines.push(`**In Action:** ${s(d.archetypeInAction)}`);
  if (d.marketingExpression) lines.push(`**Marketing Expression:** ${s(d.marketingExpression)}`);
  if (d.customerExperience) lines.push(`**Customer Experience:** ${s(d.customerExperience)}`);
  if (d.contentStrategy) lines.push(`**Content Strategy:** ${s(d.contentStrategy)}`);
  if (d.storytellingApproach) lines.push(`**Storytelling:** ${s(d.storytellingApproach)}`);

  lines.push('#### Reference & Positioning');
  const examples = arr(d.brandExamples).filter(Boolean);
  if (examples.length > 0) lines.push(`**Reference Brands:**\n${examples.map(e => `- ${s(e)}`).join('\n')}`);
  if (d.positioningApproach) lines.push(`**Positioning:** ${s(d.positioningApproach)}`);
  if (d.competitiveLandscape) lines.push(`**Competitive Landscape:** ${s(d.competitiveLandscape)}`);
  return lines.join('\n\n');
}

function formatTransformativeGoals(d: Record<string, unknown>): string {
  const lines: string[] = [];

  if (d.massiveTransformativePurpose) lines.push(`**MTP:** ${s(d.massiveTransformativePurpose)}`);
  if (d.mtpNarrative) lines.push(`**MTP Narrative:** ${s(d.mtpNarrative)}`);

  const goals = arr(d.goals);
  if (goals.length > 0) {
    lines.push('#### Goals');
    for (const g of goals) {
      const goal = obj(g);
      const parts: string[] = [];
      if (goal.title) parts.push(`**${s(goal.title)}**`);
      if (goal.description) parts.push(s(goal.description));
      if (goal.impactDomain) parts.push(`*Impact Domain:* ${s(goal.impactDomain)}`);
      if (goal.timeframe) parts.push(`*Timeframe:* ${s(goal.timeframe)}`);
      if (goal.measurableCommitment) parts.push(`*Measurable Commitment:* ${s(goal.measurableCommitment)}`);
      if (goal.theoryOfChange) parts.push(`*Theory of Change:* ${s(goal.theoryOfChange)}`);
      lines.push(parts.join('\n'));
    }
  }

  const authScores = obj(d.authenticityScores);
  const scoreEntries = Object.entries(authScores).filter(([, v]) => typeof v === 'number' && (v as number) > 0);
  if (scoreEntries.length > 0) {
    const labels: Record<string, string> = {
      ambition: 'Ambition', authenticity: 'Authenticity', clarity: 'Clarity',
      measurability: 'Measurability', integration: 'Integration', longevity: 'Longevity',
    };
    lines.push(`**Authenticity Scores:** ${scoreEntries.map(([k, v]) => `${labels[k] || k}: ${v}/5`).join(', ')}`);
  }

  const stakeholders = arr(d.stakeholderImpact);
  if (stakeholders.length > 0) {
    lines.push('#### Stakeholder Impact');
    for (const sh of stakeholders) {
      const st = obj(sh);
      lines.push(`- **${s(st.stakeholder)}** (${s(st.role)}): ${s(st.expectedImpact)}`);
    }
  }

  const bi = obj(d.brandIntegration);
  if (bi.positioningLink || bi.themes || bi.internalActivation) {
    lines.push('#### Brand Integration');
    if (bi.positioningLink) lines.push(`**Positioning:** ${s(bi.positioningLink)}`);
    const themes = arr(bi.themes || bi.communicationThemes).filter(Boolean);
    if (themes.length > 0) lines.push(`**Themes:** ${themes.map(t => s(t)).join(', ')}`);
    if (bi.internalActivation) lines.push(`**Internal Activation:** ${s(bi.internalActivation)}`);
  }

  return lines.join('\n\n');
}

const DIMENSION_LABELS: Record<string, string> = {
  sincerity: 'Sincerity', excitement: 'Excitement', competence: 'Competence',
  sophistication: 'Sophistication', ruggedness: 'Ruggedness',
};

const SPECTRUM_LABELS: Record<string, [string, string]> = {
  friendlyFormal: ['Friendly', 'Formal'],
  energeticThoughtful: ['Energetic', 'Thoughtful'],
  modernTraditional: ['Modern', 'Traditional'],
  playfulSerious: ['Playful', 'Serious'],
  boldSubtle: ['Bold', 'Subtle'],
  abstractConcrete: ['Abstract', 'Concrete'],
  eliteAccessible: ['Elite', 'Accessible'],
};

const TONE_LABELS: Record<string, [string, string]> = {
  funnySerious: ['Funny', 'Serious'],
  formalCasual: ['Formal', 'Casual'],
  respectfulIrreverent: ['Respectful', 'Irreverent'],
  enthusiasticMatterOfFact: ['Enthusiastic', 'Matter-of-fact'],
};

function formatBrandPersonality(d: Record<string, unknown>): string {
  const lines: string[] = [];

  if (d.primaryDimension) {
    let identity = `**Primary Dimension:** ${s(d.primaryDimension)}`;
    if (d.secondaryDimension) identity += ` | **Secondary:** ${s(d.secondaryDimension)}`;
    lines.push(identity);
  }

  const dimScores = obj(d.dimensionScores);
  const scored = Object.entries(dimScores)
    .filter(([, v]) => typeof v === 'number' && (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number));
  if (scored.length > 0) {
    lines.push(`**Dimension Scores:** ${scored.map(([k, v]) => `${DIMENSION_LABELS[k] || k}: ${v}/5`).join(', ')}`);
  }

  const traits = arr(d.personalityTraits);
  if (traits.length > 0) {
    lines.push('#### Personality Traits');
    for (const t of traits) {
      const trait = obj(t);
      const parts = [`**${s(trait.name)}**`];
      if (trait.description) parts.push(s(trait.description));
      if (trait.weAreThis) parts.push(`*We are:* ${s(trait.weAreThis)}`);
      if (trait.butNeverThat) parts.push(`*But never:* ${s(trait.butNeverThat)}`);
      lines.push(parts.join(' — '));
    }
  }

  const spectrum = obj(d.spectrumSliders);
  const spectrumEntries = Object.entries(spectrum).filter(([, v]) => typeof v === 'number');
  if (spectrumEntries.length > 0) {
    lines.push('#### Personality Spectrum');
    for (const [k, v] of spectrumEntries) {
      const labels = SPECTRUM_LABELS[k];
      if (!labels) continue;
      const val = v as number;
      const bar = '▓'.repeat(val) + '░'.repeat(7 - val);
      lines.push(`${labels[0]} [${bar}] ${labels[1]} (${val}/7)`);
    }
  }

  const tone = obj(d.toneDimensions);
  const toneEntries = Object.entries(tone).filter(([, v]) => typeof v === 'number');
  if (toneEntries.length > 0) {
    lines.push('#### Tone of Voice');
    for (const [k, v] of toneEntries) {
      const labels = TONE_LABELS[k];
      if (!labels) continue;
      const val = v as number;
      const bar = '▓'.repeat(val) + '░'.repeat(7 - val);
      lines.push(`${labels[0]} [${bar}] ${labels[1]} (${val}/7)`);
    }
  }

  if (d.brandVoiceDescription) lines.push(`**Brand Voice:** ${s(d.brandVoiceDescription)}`);

  const wordsUse = arr(d.wordsWeUse).filter(Boolean);
  if (wordsUse.length > 0) lines.push(`**Words We Use:** ${wordsUse.map(w => `"${s(w)}"`).join(', ')}`);
  const wordsAvoid = arr(d.wordsWeAvoid).filter(Boolean);
  if (wordsAvoid.length > 0) lines.push(`**Words We Avoid:** ${wordsAvoid.map(w => `"${s(w)}"`).join(', ')}`);

  if (d.writingSample) lines.push(`**Writing Sample:**\n> ${s(d.writingSample)}`);

  const channels = obj(d.channelTones);
  const channelEntries = Object.entries(channels).filter(([, v]) => !!v);
  if (channelEntries.length > 0) {
    lines.push('#### Channel-Specific Tone');
    for (const [k, v] of channelEntries) {
      lines.push(`- **${k}:** ${s(v)}`);
    }
  }

  if (d.colorDirection) lines.push(`**Color Direction:** ${s(d.colorDirection)}`);
  if (d.typographyDirection) lines.push(`**Typography Direction:** ${s(d.typographyDirection)}`);
  if (d.imageryDirection) lines.push(`**Imagery Direction:** ${s(d.imageryDirection)}`);

  return lines.join('\n\n');
}

function formatBrandStory(d: Record<string, unknown>): string {
  const lines: string[] = [];

  lines.push('#### Origin & Belief');
  if (d.originStory) lines.push(`**Origin:** ${s(d.originStory)}`);
  if (d.founderMotivation) lines.push(`**Founder Motivation:** ${s(d.founderMotivation)}`);
  if (d.coreBeliefStatement) lines.push(`**Core Belief:** ${s(d.coreBeliefStatement)}`);

  lines.push('#### Problem Landscape');
  if (d.worldContext) lines.push(`**World Context:** ${s(d.worldContext)}`);
  if (d.customerExternalProblem) lines.push(`**External Problem:** ${s(d.customerExternalProblem)}`);
  if (d.customerInternalProblem) lines.push(`**Internal Problem:** ${s(d.customerInternalProblem)}`);
  if (d.philosophicalProblem) lines.push(`**Philosophical Problem:** ${s(d.philosophicalProblem)}`);
  if (d.stakesCostOfInaction) lines.push(`**Stakes (Cost of Inaction):** ${s(d.stakesCostOfInaction)}`);

  lines.push('#### Brand as Guide');
  if (d.brandRole) lines.push(`**Brand Role:** ${s(d.brandRole)}`);
  if (d.empathyStatement) lines.push(`**Empathy:** ${s(d.empathyStatement)}`);
  if (d.authorityCredentials) lines.push(`**Authority:** ${s(d.authorityCredentials)}`);

  lines.push('#### Transformation');
  if (d.transformationPromise) lines.push(`**Transformation:** ${s(d.transformationPromise)}`);
  if (d.customerSuccessVision) lines.push(`**Customer Success Vision:** ${s(d.customerSuccessVision)}`);

  lines.push('#### Narrative Toolkit');
  if (d.abtStatement) lines.push(`**ABT Statement:** ${s(d.abtStatement)}`);
  if (d.narrativeArc) lines.push(`**Narrative Arc:** ${s(d.narrativeArc)}`);
  const themes = arr(d.brandThemes).filter(Boolean);
  if (themes.length > 0) lines.push(`**Brand Themes:** ${themes.map(t => s(t)).join(', ')}`);
  const emotions = arr(d.emotionalTerritory).filter(Boolean);
  if (emotions.length > 0) lines.push(`**Emotional Territory:** ${emotions.map(e => s(e)).join(', ')}`);
  const messages = arr(d.keyNarrativeMessages).filter(Boolean);
  if (messages.length > 0) lines.push(`**Key Messages:**\n${messages.map(m => `- ${s(m)}`).join('\n')}`);

  lines.push('#### Evidence');
  const pp = arr(d.proofPoints).filter(Boolean);
  if (pp.length > 0) lines.push(`**Proof Points:**\n${pp.map(p => `- ${s(p)}`).join('\n')}`);
  const via = arr(d.valuesInAction).filter(Boolean);
  if (via.length > 0) lines.push(`**Values in Action:**\n${via.map(v => `- ${s(v)}`).join('\n')}`);

  lines.push('#### Expressions');
  if (d.elevatorPitch) lines.push(`**Elevator Pitch:** ${s(d.elevatorPitch)}`);
  if (d.manifestoText) lines.push(`**Manifesto:**\n> ${s(d.manifestoText)}`);

  const adapt = obj(d.audienceAdaptations);
  const adaptEntries = Object.entries(adapt).filter(([, v]) => !!v);
  if (adaptEntries.length > 0) {
    lines.push('#### Audience Adaptations');
    for (const [k, v] of adaptEntries) {
      lines.push(`- **${k}:** ${s(v)}`);
    }
  }

  return lines.join('\n\n');
}

function formatBrandHouseValues(d: Record<string, unknown>): string {
  const lines: string[] = [];

  const formatVal = (v: unknown, label: string) => {
    const val = obj(v);
    if (!val.name) return;
    lines.push(`**${label}: ${s(val.name)}**`);
    if (val.description) lines.push(s(val.description));
  };

  lines.push('#### Roots (Anchor Values)');
  formatVal(d.anchorValue1, 'Root 1');
  formatVal(d.anchorValue2, 'Root 2');

  lines.push('#### Wings (Aspiration Values)');
  formatVal(d.aspirationValue1, 'Wing 1');
  formatVal(d.aspirationValue2, 'Wing 2');

  lines.push('#### Fire (Own Value)');
  formatVal(d.ownValue, 'Fire');

  if (d.valueTension) lines.push(`**Value Tension:** ${s(d.valueTension)}`);

  return lines.join('\n\n');
}

function formatSocialRelevancy(d: Record<string, unknown>): string {
  const lines: string[] = [];

  if (d.impactStatement) lines.push(`**Impact Statement:** ${s(d.impactStatement)}`);
  if (d.impactNarrative) lines.push(`**Impact Narrative:** ${s(d.impactNarrative)}`);
  if (d.activismLevel) lines.push(`**Activism Level:** ${s(d.activismLevel)}`);

  const formatPillar = (label: string, pillar: unknown) => {
    const p = obj(pillar);
    const stmts = arr(p.statements);
    if (stmts.length === 0 && !p.pillarReflection) return;

    const total = stmts.reduce((sum: number, st) => sum + (Number((obj(st) as Record<string, unknown>).score) || 0), 0);
    lines.push(`#### ${label} (Score: ${total}/15)`);

    for (const st of stmts) {
      const stmt = obj(st);
      lines.push(`- ${s(stmt.text)} **[${s(stmt.score)}/5]**`);
      if (stmt.evidence) lines.push(`  *Evidence:* ${s(stmt.evidence)}`);
      if (stmt.target) lines.push(`  *Target:* ${s(stmt.target)}${stmt.timeline ? ` (${s(stmt.timeline)})` : ''}`);
    }

    if (p.pillarReflection) lines.push(`*Reflection:* ${s(p.pillarReflection)}`);
  };

  formatPillar('Milieu (Environment)', d.milieu);
  formatPillar('Mens (People)', d.mens);
  formatPillar('Maatschappij (Society)', d.maatschappij);

  const authScores = obj(d.authenticityScores);
  const scoreEntries = Object.entries(authScores).filter(([, v]) => typeof v === 'number' && (v as number) > 0);
  if (scoreEntries.length > 0) {
    const labels: Record<string, string> = {
      walkTheTalk: 'Walk-the-Talk', transparency: 'Transparency', consistency: 'Consistency',
      stakeholderTrust: 'Stakeholder Trust', measurability: 'Measurability', longTermCommitment: 'Long-term Commitment',
    };
    const avg = Math.round((scoreEntries.reduce((sum, [, v]) => sum + (v as number), 0) / scoreEntries.length) * 20);
    lines.push(`**Authenticity Score: ${avg}%** — ${scoreEntries.map(([k, v]) => `${labels[k] ?? k}: ${v}/5`).join(', ')}`);
  }

  const pp = arr(d.proofPoints).filter(Boolean);
  if (pp.length > 0) lines.push(`**Proof Points:**\n${pp.map(p => `- ${s(p)}`).join('\n')}`);
  if (d.antiGreenwashingStatement) lines.push(`**Anti-Greenwashing:** ${s(d.antiGreenwashingStatement)}`);

  const sdgs = arr(d.sdgAlignment).filter(Boolean);
  if (sdgs.length > 0) lines.push(`**SDG Alignment:** ${sdgs.map(n => `SDG ${n}`).join(', ')}`);

  const principles = arr(d.communicationPrinciples).filter(Boolean);
  if (principles.length > 0) lines.push(`**Communication Principles:**\n${principles.map(p => `- ${s(p)}`).join('\n')}`);

  const stakeholders = arr(d.keyStakeholders).filter(Boolean);
  if (stakeholders.length > 0) lines.push(`**Key Stakeholders:** ${stakeholders.map(s2 => s(s2)).join(', ')}`);

  const channels = arr(d.activationChannels).filter(Boolean);
  if (channels.length > 0) lines.push(`**Activation Channels:** ${channels.map(c => s(c)).join(', ')}`);

  return lines.join('\n\n');
}

// ── Slug → Formatter mapping ──────────────────────────────────

const SLUG_ORDER = [
  'purpose-statement',
  'golden-circle',
  'brand-essence',
  'brand-promise',
  'mission-statement',
  'brand-archetype',
  'transformative-goals',
  'brand-personality',
  'brand-story',
  'core-values',
  'social-relevancy',
];

const SLUG_TITLES: Record<string, string> = {
  'purpose-statement': 'Purpose Statement',
  'golden-circle': 'Golden Circle',
  'brand-essence': 'Brand Essence',
  'brand-promise': 'Brand Promise',
  'mission-statement': 'Mission & Vision',
  'brand-archetype': 'Brand Archetype',
  'transformative-goals': 'Transformative Goals',
  'brand-personality': 'Brand Personality',
  'brand-story': 'Brand Story',
  'core-values': 'Core Values (BrandHouse)',
  'social-relevancy': 'Social Relevancy',
};

const FORMATTERS: Record<string, (d: Record<string, unknown>) => string> = {
  'purpose-statement': formatPurposeWheel,
  'golden-circle': formatGoldenCircle,
  'brand-essence': formatBrandEssence,
  'brand-promise': formatBrandPromise,
  'mission-statement': formatMissionVision,
  'brand-archetype': formatBrandArchetype,
  'transformative-goals': formatTransformativeGoals,
  'brand-personality': formatBrandPersonality,
  'brand-story': formatBrandStory,
  'core-values': formatBrandHouseValues,
  'social-relevancy': formatSocialRelevancy,
};

// ── Main ────────────────────────────────────────────────────

async function main() {
  const workspace = await prisma.workspace.findUnique({
    where: { id: WORKSPACE_ID },
    select: { name: true },
  });

  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: {
      slug: true,
      name: true,
      description: true,
      frameworkData: true,
    },
  });

  const bySlug = new Map(assets.map(a => [a.slug, a]));
  const brandName = workspace?.name ?? 'Goed-Bouw';
  const now = new Date().toISOString().split('T')[0];

  const sections: string[] = [
    `# ${brandName} — Brand Foundation Export`,
    `*Generated: ${now}*`,
    '',
    '---',
    '',
  ];

  let count = 0;
  for (const slug of SLUG_ORDER) {
    const asset = bySlug.get(slug);
    if (!asset) continue;

    const fw = asset.frameworkData as Record<string, unknown> | null;
    if (!fw || Object.keys(fw).length === 0) continue;

    const title = SLUG_TITLES[slug] || asset.name;
    const formatter = FORMATTERS[slug];

    count++;
    sections.push(`## ${count}. ${title}`);
    if (asset.description) sections.push(`*${asset.description}*`);
    sections.push('');

    if (formatter) {
      sections.push(formatter(fw));
    } else {
      sections.push('```json');
      sections.push(JSON.stringify(fw, null, 2));
      sections.push('```');
    }

    sections.push('');
    sections.push('---');
    sections.push('');
  }

  const markdown = sections.join('\n');
  const outputPath = path.resolve('/Users/erikjager/Desktop', `${brandName.replace(/\s+/g, '-')}-Brand-Foundation.md`);
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`✅ Export saved to: ${outputPath}`);
  console.log(`   ${count} brand assets exported.`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
