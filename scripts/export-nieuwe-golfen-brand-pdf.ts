/**
 * Export Het Nieuwe Golfen brand foundation to a styled PDF.
 * Run: DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/export-nieuwe-golfen-brand-pdf.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const pool = new pg.Pool({ connectionString: 'postgresql://erikjager:@localhost:5432/branddock' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const WORKSPACE_ID = 'cmpp4dxgc001w4ums9sttpg62';

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
  return val && typeof val === 'object' && !Array.isArray(val) ? (val as Record<string, unknown>) : {};
}

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

// kv = key + value renderer
function kv(label: string, val: unknown): string {
  const v = s(val);
  if (!v) return '';
  return `<div class="kv"><span class="k">${esc(label)}</span><span class="v">${esc(v)}</span></div>`;
}

function quote(label: string, val: unknown): string {
  const v = s(val);
  if (!v) return '';
  return `<div class="kv"><span class="k">${esc(label)}</span><blockquote>${esc(v)}</blockquote></div>`;
}

function list(label: string, items: unknown[]): string {
  const filtered = items.filter(Boolean).map((i) => s(i));
  if (filtered.length === 0) return '';
  return `<div class="kv"><span class="k">${esc(label)}</span><ul>${filtered.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}

function chips(label: string, items: unknown[]): string {
  const filtered = items.filter(Boolean).map((i) => s(i));
  if (filtered.length === 0) return '';
  return `<div class="kv"><span class="k">${esc(label)}</span><div class="chips">${filtered.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div></div>`;
}

function subH(text: string): string {
  return `<h3 class="sub">${esc(text)}</h3>`;
}

// ── Framework Formatters ────────────────────────────────────

function formatPurposeWheel(d: Record<string, unknown>): string {
  return [
    kv('Purpose Statement', d.statement),
    kv('Impact Type', d.impactType),
    kv('Impact', d.impactDescription),
    kv('Mechanism Category', d.mechanismCategory),
    kv('Mechanism', d.mechanism),
    kv('Pressure Test', d.pressureTest),
  ].join('');
}

function formatGoldenCircle(d: Record<string, unknown>): string {
  const why = obj(d.why);
  const how = obj(d.how);
  const what = obj(d.what);
  const out: string[] = [];
  if (why.statement) {
    out.push(subH('WHY'));
    out.push(kv('Statement', why.statement));
    out.push(kv('Details', why.details));
  }
  if (how.statement) {
    out.push(subH('HOW'));
    out.push(kv('Statement', how.statement));
    out.push(kv('Details', how.details));
  }
  if (what.statement) {
    out.push(subH('WHAT'));
    out.push(kv('Statement', what.statement));
    out.push(kv('Details', what.details));
  }
  return out.join('');
}

function formatBrandEssence(d: Record<string, unknown>): string {
  return [
    kv('Essence', d.essenceStatement),
    kv('Narrative', d.essenceNarrative),
    kv('Functional Benefit', d.functionalBenefit),
    kv('Emotional Benefit', d.emotionalBenefit),
    kv('Self-Expressive Benefit', d.selfExpressiveBenefit),
    kv('Discriminator', d.discriminator),
    kv('Audience Insight', d.audienceInsight),
    list('Proof Points', arr(d.proofPoints)),
    chips('Attributes', arr(d.attributes)),
  ].join('');
}

function formatBrandPromise(d: Record<string, unknown>): string {
  return [
    kv('Promise', d.promiseStatement),
    kv('One-liner', d.promiseOneLiner),
    kv('Functional Value', d.functionalValue),
    kv('Emotional Value', d.emotionalValue),
    kv('Self-Expressive Value', d.selfExpressiveValue),
    kv('Target Audience', d.targetAudience),
    kv('Core Customer Need', d.coreCustomerNeed),
    kv('Differentiator', d.differentiator),
    kv('Onlyness Statement', d.onlynessStatement),
    list('Proof Points', arr(d.proofPoints)),
    list('Measurable Outcomes', arr(d.measurableOutcomes)),
  ].join('');
}

function formatMissionVision(d: Record<string, unknown>): string {
  const out: string[] = [];
  out.push(subH('Missie'));
  out.push(kv('One-liner', d.missionOneLiner));
  out.push(kv('Mission Statement', d.missionStatement));
  out.push(kv('For Whom', d.forWhom));
  out.push(kv('What We Do', d.whatWeDo));
  out.push(kv('How We Do It', d.howWeDoIt));
  out.push(kv('Impact Goal', d.impactGoal));
  out.push(subH('Visie'));
  out.push(kv('Vision Statement', d.visionStatement));
  out.push(kv('Time Horizon', d.timeHorizon));
  out.push(kv('Bold Aspiration (BHAG)', d.boldAspiration));
  out.push(kv('Desired Future State', d.desiredFutureState));
  out.push(list('Success Indicators', arr(d.successIndicators)));
  out.push(kv('Stakeholder Benefit', d.stakeholderBenefit));
  out.push(kv('Values Alignment', d.valuesAlignment));
  out.push(kv('Mission-Vision Tension', d.missionVisionTension));
  return out.join('');
}

function formatBrandArchetype(d: Record<string, unknown>): string {
  const out: string[] = [];
  if (d.primaryArchetype) {
    let identity = `<strong>Archetype:</strong> ${esc(s(d.primaryArchetype))}`;
    if (d.subArchetype) identity += ` — Sub-archetype: ${esc(s(d.subArchetype))}`;
    out.push(`<div class="identity">${identity}</div>`);
  }
  out.push(subH('Core Psychology'));
  out.push(kv('Core Desire', d.coreDesire));
  out.push(kv('Core Fear', d.coreFear));
  out.push(kv('Brand Goal', d.brandGoal));
  out.push(kv('Strategy', d.strategy));
  out.push(kv('Gift/Talent', d.giftTalent));
  out.push(kv('Shadow/Weakness', d.shadowWeakness));
  out.push(subH('Archetype in Action'));
  out.push(kv('In Action', d.archetypeInAction));
  out.push(kv('Marketing Expression', d.marketingExpression));
  out.push(kv('Customer Experience', d.customerExperience));
  out.push(kv('Content Strategy', d.contentStrategy));
  out.push(kv('Storytelling', d.storytellingApproach));
  out.push(subH('Reference & Positioning'));
  out.push(list('Reference Brands', arr(d.brandExamples)));
  out.push(kv('Positioning', d.positioningApproach));
  out.push(kv('Competitive Landscape', d.competitiveLandscape));
  return out.join('');
}

function formatTransformativeGoals(d: Record<string, unknown>): string {
  const out: string[] = [];
  out.push(kv('MTP', d.massiveTransformativePurpose));
  out.push(kv('MTP Narrative', d.mtpNarrative));

  const goals = arr(d.goals);
  if (goals.length > 0) {
    out.push(subH('Goals'));
    for (const g of goals) {
      const goal = obj(g);
      const parts: string[] = ['<div class="card">'];
      if (goal.title) parts.push(`<div class="card-title">${esc(s(goal.title))}</div>`);
      if (goal.description) parts.push(`<div class="card-body">${esc(s(goal.description))}</div>`);
      if (goal.impactDomain) parts.push(kv('Impact Domain', goal.impactDomain));
      if (goal.timeframe) parts.push(kv('Timeframe', goal.timeframe));
      if (goal.measurableCommitment) parts.push(kv('Measurable Commitment', goal.measurableCommitment));
      if (goal.theoryOfChange) parts.push(kv('Theory of Change', goal.theoryOfChange));
      parts.push('</div>');
      out.push(parts.join(''));
    }
  }

  const authScores = obj(d.authenticityScores);
  const scoreEntries = Object.entries(authScores).filter(([, v]) => typeof v === 'number' && (v as number) > 0);
  if (scoreEntries.length > 0) {
    const labels: Record<string, string> = {
      ambition: 'Ambition',
      authenticity: 'Authenticity',
      clarity: 'Clarity',
      measurability: 'Measurability',
      integration: 'Integration',
      longevity: 'Longevity',
    };
    out.push(
      `<div class="kv"><span class="k">Authenticity Scores</span><span class="v">${scoreEntries.map(([k, v]) => `${labels[k] || k}: ${v}/5`).join(' · ')}</span></div>`,
    );
  }

  const stakeholders = arr(d.stakeholderImpact);
  if (stakeholders.length > 0) {
    out.push(subH('Stakeholder Impact'));
    const items = stakeholders.map((sh) => {
      const st = obj(sh);
      return `<li><strong>${esc(s(st.stakeholder))}</strong> (${esc(s(st.role))}): ${esc(s(st.expectedImpact))}</li>`;
    });
    out.push(`<ul>${items.join('')}</ul>`);
  }

  const bi = obj(d.brandIntegration);
  if (bi.positioningLink || bi.themes || bi.internalActivation) {
    out.push(subH('Brand Integration'));
    out.push(kv('Positioning', bi.positioningLink));
    const themes = arr(bi.themes || bi.communicationThemes).filter(Boolean);
    if (themes.length > 0) out.push(chips('Themes', themes));
    out.push(kv('Internal Activation', bi.internalActivation));
  }

  return out.join('');
}

const DIMENSION_LABELS: Record<string, string> = {
  sincerity: 'Sincerity',
  excitement: 'Excitement',
  competence: 'Competence',
  sophistication: 'Sophistication',
  ruggedness: 'Ruggedness',
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

function slider(left: string, right: string, val: number, max = 7): string {
  const pct = Math.max(0, Math.min(100, (val / max) * 100));
  return `<div class="slider"><span class="slider-l">${esc(left)}</span><div class="slider-track"><div class="slider-fill" style="width:${pct}%"></div><div class="slider-dot" style="left:${pct}%"></div></div><span class="slider-r">${esc(right)}</span><span class="slider-v">${val}/${max}</span></div>`;
}

function formatBrandPersonality(d: Record<string, unknown>): string {
  const out: string[] = [];

  if (d.primaryDimension) {
    let identity = `<strong>Primary Dimension:</strong> ${esc(s(d.primaryDimension))}`;
    if (d.secondaryDimension) identity += ` | <strong>Secondary:</strong> ${esc(s(d.secondaryDimension))}`;
    out.push(`<div class="identity">${identity}</div>`);
  }

  const dimScores = obj(d.dimensionScores);
  const scored = Object.entries(dimScores)
    .filter(([, v]) => typeof v === 'number' && (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number));
  if (scored.length > 0) {
    out.push(
      `<div class="kv"><span class="k">Dimension Scores</span><span class="v">${scored.map(([k, v]) => `${DIMENSION_LABELS[k] || k}: ${v}/5`).join(' · ')}</span></div>`,
    );
  }

  const traits = arr(d.personalityTraits);
  if (traits.length > 0) {
    out.push(subH('Personality Traits'));
    for (const t of traits) {
      const trait = obj(t);
      out.push('<div class="card">');
      if (trait.name) out.push(`<div class="card-title">${esc(s(trait.name))}</div>`);
      if (trait.description) out.push(`<div class="card-body">${esc(s(trait.description))}</div>`);
      if (trait.weAreThis) out.push(kv('We are', trait.weAreThis));
      if (trait.butNeverThat) out.push(kv('But never', trait.butNeverThat));
      out.push('</div>');
    }
  }

  const spectrum = obj(d.spectrumSliders);
  const spectrumEntries = Object.entries(spectrum).filter(([, v]) => typeof v === 'number');
  if (spectrumEntries.length > 0) {
    out.push(subH('Personality Spectrum'));
    for (const [k, v] of spectrumEntries) {
      const labels = SPECTRUM_LABELS[k];
      if (!labels) continue;
      out.push(slider(labels[0], labels[1], v as number));
    }
  }

  const tone = obj(d.toneDimensions);
  const toneEntries = Object.entries(tone).filter(([, v]) => typeof v === 'number');
  if (toneEntries.length > 0) {
    out.push(subH('Tone of Voice'));
    for (const [k, v] of toneEntries) {
      const labels = TONE_LABELS[k];
      if (!labels) continue;
      out.push(slider(labels[0], labels[1], v as number));
    }
  }

  out.push(kv('Brand Voice', d.brandVoiceDescription));

  const wordsUse = arr(d.wordsWeUse).filter(Boolean);
  if (wordsUse.length > 0) out.push(chips('Words We Use', wordsUse));
  const wordsAvoid = arr(d.wordsWeAvoid).filter(Boolean);
  if (wordsAvoid.length > 0) out.push(chips('Words We Avoid', wordsAvoid));

  if (d.writingSample) out.push(quote('Writing Sample', d.writingSample));

  const channels = obj(d.channelTones);
  const channelEntries = Object.entries(channels).filter(([, v]) => !!v);
  if (channelEntries.length > 0) {
    out.push(subH('Channel-Specific Tone'));
    const items = channelEntries.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(s(v))}</li>`);
    out.push(`<ul>${items.join('')}</ul>`);
  }

  out.push(kv('Color Direction', d.colorDirection));
  out.push(kv('Typography Direction', d.typographyDirection));
  out.push(kv('Imagery Direction', d.imageryDirection));

  return out.join('');
}

function formatBrandStory(d: Record<string, unknown>): string {
  const out: string[] = [];

  out.push(subH('Origin & Belief'));
  out.push(kv('Origin', d.originStory));
  out.push(kv('Founder Motivation', d.founderMotivation));
  out.push(kv('Core Belief', d.coreBeliefStatement));

  out.push(subH('Problem Landscape'));
  out.push(kv('World Context', d.worldContext));
  out.push(kv('External Problem', d.customerExternalProblem));
  out.push(kv('Internal Problem', d.customerInternalProblem));
  out.push(kv('Philosophical Problem', d.philosophicalProblem));
  out.push(kv('Stakes (Cost of Inaction)', d.stakesCostOfInaction));

  out.push(subH('Brand as Guide'));
  out.push(kv('Brand Role', d.brandRole));
  out.push(kv('Empathy', d.empathyStatement));
  out.push(kv('Authority', d.authorityCredentials));

  out.push(subH('Transformation'));
  out.push(kv('Transformation', d.transformationPromise));
  out.push(kv('Customer Success Vision', d.customerSuccessVision));

  out.push(subH('Narrative Toolkit'));
  out.push(kv('ABT Statement', d.abtStatement));
  out.push(kv('Narrative Arc', d.narrativeArc));
  out.push(chips('Brand Themes', arr(d.brandThemes)));
  out.push(chips('Emotional Territory', arr(d.emotionalTerritory)));
  out.push(list('Key Messages', arr(d.keyNarrativeMessages)));

  out.push(subH('Evidence'));
  out.push(list('Proof Points', arr(d.proofPoints)));
  out.push(list('Values in Action', arr(d.valuesInAction)));

  out.push(subH('Expressions'));
  out.push(kv('Elevator Pitch', d.elevatorPitch));
  if (d.manifestoText) out.push(quote('Manifesto', d.manifestoText));

  const adapt = obj(d.audienceAdaptations);
  const adaptEntries = Object.entries(adapt).filter(([, v]) => !!v);
  if (adaptEntries.length > 0) {
    out.push(subH('Audience Adaptations'));
    const items = adaptEntries.map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(s(v))}</li>`);
    out.push(`<ul>${items.join('')}</ul>`);
  }

  return out.join('');
}

function formatBrandHouseValues(d: Record<string, unknown>): string {
  const out: string[] = [];

  const formatVal = (v: unknown, label: string) => {
    const val = obj(v);
    if (!val.name) return;
    out.push('<div class="card">');
    out.push(`<div class="card-title">${esc(label)}: ${esc(s(val.name))}</div>`);
    if (val.description) out.push(`<div class="card-body">${esc(s(val.description))}</div>`);
    out.push('</div>');
  };

  out.push(subH('Roots (Anchor Values)'));
  formatVal(d.anchorValue1, 'Root 1');
  formatVal(d.anchorValue2, 'Root 2');

  out.push(subH('Wings (Aspiration Values)'));
  formatVal(d.aspirationValue1, 'Wing 1');
  formatVal(d.aspirationValue2, 'Wing 2');

  out.push(subH('Fire (Own Value)'));
  formatVal(d.ownValue, 'Fire');

  out.push(kv('Value Tension', d.valueTension));

  return out.join('');
}

function formatSocialRelevancy(d: Record<string, unknown>): string {
  const out: string[] = [];

  out.push(kv('Impact Statement', d.impactStatement));
  out.push(kv('Impact Narrative', d.impactNarrative));
  out.push(kv('Activism Level', d.activismLevel));

  const formatPillar = (label: string, pillar: unknown) => {
    const p = obj(pillar);
    const stmts = arr(p.statements);
    if (stmts.length === 0 && !p.pillarReflection) return;

    const total = stmts.reduce((sum: number, st) => sum + (Number((obj(st) as Record<string, unknown>).score) || 0), 0);
    out.push(subH(`${label} (Score: ${total}/15)`));

    const items: string[] = [];
    for (const st of stmts) {
      const stmt = obj(st);
      let line = `<li>${esc(s(stmt.text))} <span class="badge">${esc(s(stmt.score))}/5</span>`;
      if (stmt.evidence) line += `<div class="note"><em>Evidence:</em> ${esc(s(stmt.evidence))}</div>`;
      if (stmt.target) line += `<div class="note"><em>Target:</em> ${esc(s(stmt.target))}${stmt.timeline ? ` (${esc(s(stmt.timeline))})` : ''}</div>`;
      line += '</li>';
      items.push(line);
    }
    if (items.length > 0) out.push(`<ul class="scored">${items.join('')}</ul>`);

    if (p.pillarReflection) out.push(`<div class="note"><em>Reflection:</em> ${esc(s(p.pillarReflection))}</div>`);
  };

  formatPillar('Milieu (Environment)', d.milieu);
  formatPillar('Mens (People)', d.mens);
  formatPillar('Maatschappij (Society)', d.maatschappij);

  const authScores = obj(d.authenticityScores);
  const scoreEntries = Object.entries(authScores).filter(([, v]) => typeof v === 'number' && (v as number) > 0);
  if (scoreEntries.length > 0) {
    const labels: Record<string, string> = {
      walkTheTalk: 'Walk-the-Talk',
      transparency: 'Transparency',
      consistency: 'Consistency',
      stakeholderTrust: 'Stakeholder Trust',
      measurability: 'Measurability',
      longTermCommitment: 'Long-term Commitment',
    };
    const avg = Math.round((scoreEntries.reduce((sum, [, v]) => sum + (v as number), 0) / scoreEntries.length) * 20);
    out.push(
      `<div class="kv"><span class="k">Authenticity Score: ${avg}%</span><span class="v">${scoreEntries.map(([k, v]) => `${labels[k] ?? k}: ${v}/5`).join(' · ')}</span></div>`,
    );
  }

  out.push(list('Proof Points', arr(d.proofPoints)));
  out.push(kv('Anti-Greenwashing', d.antiGreenwashingStatement));

  const sdgs = arr(d.sdgAlignment).filter(Boolean);
  if (sdgs.length > 0) out.push(chips('SDG Alignment', sdgs.map((n) => `SDG ${s(n)}`)));

  out.push(list('Communication Principles', arr(d.communicationPrinciples)));
  out.push(chips('Key Stakeholders', arr(d.keyStakeholders)));
  out.push(chips('Activation Channels', arr(d.activationChannels)));

  return out.join('');
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

// ── Styling ─────────────────────────────────────────────────

const CSS = `
  :root {
    --primary: #1FD1B2;
    --primary-dark: #0d9488;
    --ink: #0f172a;
    --muted: #64748b;
    --border: #e2e8f0;
    --bg-soft: #f8fafc;
    --accent: #f0fdfa;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    color: var(--ink);
    font-size: 11pt;
    line-height: 1.55;
  }
  .cover {
    page-break-after: always;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 80px;
    background: linear-gradient(135deg, #0d9488 0%, #1FD1B2 100%);
    color: white;
  }
  .cover .eyebrow {
    font-size: 12pt;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    opacity: 0.85;
    margin-bottom: 24px;
  }
  .cover h1 {
    font-size: 56pt;
    line-height: 1.05;
    margin: 0 0 24px 0;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .cover .subtitle {
    font-size: 16pt;
    opacity: 0.9;
    margin-bottom: 64px;
  }
  .cover .meta {
    font-size: 10pt;
    opacity: 0.8;
    border-top: 1px solid rgba(255,255,255,0.3);
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
  }
  .toc {
    page-break-after: always;
    padding: 60px 80px;
  }
  .toc h2 {
    font-size: 22pt;
    margin: 0 0 24px 0;
    color: var(--ink);
    border-bottom: 2px solid var(--primary);
    padding-bottom: 8px;
  }
  .toc ol {
    list-style: none;
    padding: 0;
    counter-reset: toc;
  }
  .toc li {
    counter-increment: toc;
    padding: 10px 0;
    border-bottom: 1px dashed var(--border);
    font-size: 12pt;
    display: flex;
    align-items: baseline;
    gap: 14px;
  }
  .toc li::before {
    content: counter(toc, decimal-leading-zero);
    color: var(--primary-dark);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    min-width: 32px;
  }
  .content {
    padding: 40px 80px 80px;
  }
  section.framework {
    page-break-inside: avoid;
    page-break-before: auto;
    margin-bottom: 48px;
    padding-bottom: 24px;
  }
  section.framework + section.framework {
    border-top: 1px solid var(--border);
    padding-top: 32px;
  }
  .section-header {
    margin-bottom: 20px;
  }
  .section-number {
    font-size: 9pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--primary-dark);
    font-weight: 600;
  }
  h1.section-title {
    font-size: 26pt;
    margin: 4px 0 0 0;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .section-desc {
    color: var(--muted);
    font-style: italic;
    margin: 8px 0 0 0;
    font-size: 10.5pt;
  }
  h3.sub {
    font-size: 13pt;
    color: var(--primary-dark);
    margin: 24px 0 12px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--accent);
    font-weight: 600;
  }
  .kv {
    margin: 8px 0;
    page-break-inside: avoid;
  }
  .kv .k {
    display: block;
    font-weight: 600;
    color: var(--ink);
    font-size: 9.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 3px;
  }
  .kv .v {
    display: block;
    color: var(--ink);
  }
  .identity {
    background: var(--accent);
    border-left: 3px solid var(--primary);
    padding: 10px 14px;
    margin: 0 0 16px 0;
    border-radius: 0 4px 4px 0;
    font-size: 11.5pt;
  }
  blockquote {
    margin: 4px 0;
    padding: 10px 14px;
    border-left: 3px solid var(--primary);
    background: var(--bg-soft);
    font-style: italic;
    border-radius: 0 4px 4px 0;
  }
  ul {
    margin: 4px 0;
    padding-left: 18px;
  }
  ul li {
    margin: 4px 0;
  }
  ul.scored li {
    margin-bottom: 10px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .chip {
    background: var(--accent);
    color: var(--primary-dark);
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 9.5pt;
    border: 1px solid #ccfbf1;
  }
  .badge {
    display: inline-block;
    background: var(--primary);
    color: white;
    font-size: 8.5pt;
    padding: 1px 8px;
    border-radius: 99px;
    font-weight: 600;
    margin-left: 6px;
    vertical-align: middle;
  }
  .note {
    font-size: 9.5pt;
    color: var(--muted);
    margin-left: 4px;
    margin-top: 2px;
  }
  .card {
    background: var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 14px;
    margin: 10px 0;
    page-break-inside: avoid;
  }
  .card-title {
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 4px;
    font-size: 11.5pt;
  }
  .card-body {
    color: var(--ink);
  }
  .slider {
    display: grid;
    grid-template-columns: 120px 1fr 120px 50px;
    align-items: center;
    gap: 10px;
    margin: 8px 0;
    font-size: 10pt;
  }
  .slider-l { text-align: right; color: var(--muted); }
  .slider-r { text-align: left; color: var(--muted); }
  .slider-v { color: var(--primary-dark); font-weight: 600; font-variant-numeric: tabular-nums; }
  .slider-track {
    position: relative;
    height: 6px;
    background: var(--border);
    border-radius: 99px;
  }
  .slider-fill {
    position: absolute;
    top: 0; left: 0; height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--primary-dark));
    border-radius: 99px;
  }
  .slider-dot {
    position: absolute;
    top: 50%;
    width: 12px; height: 12px;
    background: white;
    border: 2px solid var(--primary-dark);
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  @page {
    size: A4;
    margin: 18mm 0;
  }
`;

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

  const bySlug = new Map(assets.map((a) => [a.slug, a]));
  const brandName = workspace?.name ?? 'Het Nieuwe Golfen';
  const now = new Date().toLocaleDateString('nl-NL', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build TOC + sections
  const tocItems: string[] = [];
  const sectionsHtml: string[] = [];
  let count = 0;

  for (const slug of SLUG_ORDER) {
    const asset = bySlug.get(slug);
    if (!asset) continue;

    const fw = asset.frameworkData as Record<string, unknown> | null;
    if (!fw || Object.keys(fw).length === 0) continue;

    const title = SLUG_TITLES[slug] || asset.name;
    const formatter = FORMATTERS[slug];

    count++;
    tocItems.push(`<li>${esc(title)}</li>`);

    const body = formatter
      ? formatter(fw)
      : `<pre>${esc(JSON.stringify(fw, null, 2))}</pre>`;

    sectionsHtml.push(`
      <section class="framework">
        <div class="section-header">
          <div class="section-number">${String(count).padStart(2, '0')} — Framework</div>
          <h1 class="section-title">${esc(title)}</h1>
          ${asset.description ? `<p class="section-desc">${esc(asset.description)}</p>` : ''}
        </div>
        ${body}
      </section>
    `);
  }

  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>${esc(brandName)} — Brand Foundation</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="eyebrow">Brand Foundation Export</div>
    <h1>${esc(brandName)}</h1>
    <div class="subtitle">Strategische merk-DNA en positionering</div>
    <div class="meta">
      <span>Gegenereerd: ${esc(now)}</span>
      <span>Branddock · ${count} frameworks</span>
    </div>
  </div>
  <div class="toc">
    <h2>Inhoud</h2>
    <ol>${tocItems.join('')}</ol>
  </div>
  <div class="content">
    ${sectionsHtml.join('\n')}
  </div>
</body>
</html>`;

  // Write debug HTML alongside PDF (handy for review)
  const desktop = '/Users/erikjager/Desktop';
  const safeName = brandName.replace(/\s+/g, '-');
  const htmlPath = path.join(desktop, `${safeName}-Brand-Foundation.html`);
  const pdfPath = path.join(desktop, `${safeName}-Brand-Foundation.pdf`);
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // Render to PDF via Playwright
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '0', right: '0' },
  });
  await browser.close();

  console.log(`✅ PDF saved to: ${pdfPath}`);
  console.log(`   HTML (debug) saved to: ${htmlPath}`);
  console.log(`   ${count} brand assets exported.`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
