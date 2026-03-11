import { jsPDF } from 'jspdf';
import type { BrandAssetDetail } from '../types/brand-asset-detail.types';
import type { FrameworkType } from '../types/framework.types';

/** Human-readable labels for framework types */
const FRAMEWORK_LABELS: Record<string, string> = {
  PURPOSE_WHEEL: 'Purpose Statement (IDEO Purpose Wheel)',
  GOLDEN_CIRCLE: 'Golden Circle (Simon Sinek)',
  BRAND_ESSENCE: 'Brand Essence Wheel (Bates/Aaker)',
  BRAND_PROMISE: 'Brand Promise (Keller/Aaker)',
  MISSION_STATEMENT: 'Mission & Vision Statement',
  BRAND_ARCHETYPE: 'Brand Archetype (Jung / Mark & Pearson)',
  TRANSFORMATIVE_GOALS: 'Transformative Goals (MTP / BHAG)',
  BRAND_PERSONALITY: 'Brand Personality (Aaker 5 Dimensions)',
  BRAND_STORY: 'Brand Story (StoryBrand / Hero\'s Journey)',
  BRANDHOUSE_VALUES: 'Core Values (BrandHouse Model)',
  ESG: 'Social Relevancy (Triple Bottom Line)',
  SWOT: 'SWOT Analysis',
  PURPOSE_KOMPAS: 'Purpose Kompas',
};

/** PDF builder context passed to framework formatters */
interface PdfCtx {
  doc: jsPDF;
  y: number;
  margin: number;
  contentWidth: number;
  pageWidth: number;
  addSectionHeader: (title: string) => void;
  addField: (label: string, value: string | undefined | null) => void;
  addWrappedText: (text: string) => void;
  addList: (title: string, items: string[] | undefined | null) => void;
  addPairs: (title: string, pairs: Array<{ label: string; value: string }>) => void;
  checkPageBreak: (needed: number) => void;
}

/** Export a brand asset as a professionally formatted PDF */
export function exportBrandAssetPdf(asset: BrandAssetDetail) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header bar ──
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const frameworkLabel = asset.frameworkType
    ? FRAMEWORK_LABELS[asset.frameworkType] ?? asset.frameworkType
    : 'Brand Asset Export';
  doc.text(frameworkLabel, pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // ── Title ──
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(asset.name, margin, y);
  y += 8;

  // ── Category & Status ──
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const meta = [asset.category, `Status: ${asset.status}`, `Validation: ${Math.round(asset.validationPercentage)}%`].join('  |  ');
  doc.text(meta, margin, y);
  y += 8;

  // ── Divider ──
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Helper functions ──
  const addSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
  };

  const addField = (label: string, value: string | undefined | null) => {
    if (!value) return;
    checkPageBreak(12);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  };

  const addWrappedText = (text: string) => {
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 5 + 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  };

  const addList = (title: string, items: string[] | undefined | null) => {
    if (!items || items.length === 0) return;
    addSectionHeader(title);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    items.forEach(item => {
      checkPageBreak(8);
      const lines = doc.splitTextToSize(`•  ${item}`, contentWidth - 5);
      doc.text(lines, margin + 2, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  };

  const addPairs = (title: string, pairs: Array<{ label: string; value: string }>) => {
    const filled = pairs.filter(p => p.value);
    if (filled.length === 0) return;
    addSectionHeader(title);
    filled.forEach(({ label, value }) => addField(label, value));
    y += 2;
  };

  const ctx: PdfCtx = {
    doc, get y() { return y; }, set y(v) { y = v; },
    margin, contentWidth, pageWidth,
    addSectionHeader, addField, addWrappedText, addList, addPairs, checkPageBreak,
  };

  // ── Description ──
  if (asset.description) {
    addSectionHeader('Description');
    addWrappedText(asset.description);
  }

  // ── Content ──
  const contentStr = typeof asset.content === 'string'
    ? asset.content
    : asset.content ? JSON.stringify(asset.content, null, 2) : '';
  if (contentStr) {
    addSectionHeader('Content');
    addWrappedText(contentStr);
  }

  // ── Framework data ──
  if (asset.frameworkType && asset.frameworkData) {
    const data = asset.frameworkData as Record<string, unknown>;
    formatFramework(ctx, asset.frameworkType, data);
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, 280, pageWidth - margin, 280);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text('Generated by Branddock  |  Confidential', pageWidth / 2, 284, { align: 'center' });
  }

  doc.save(`${asset.name.toLowerCase().replace(/\s+/g, '-')}-brand-asset.pdf`);
}

// ─── Framework-specific formatters ──────────────────────────

function formatFramework(ctx: PdfCtx, type: FrameworkType, d: Record<string, unknown>) {
  const label = FRAMEWORK_LABELS[type] ?? type;
  ctx.addSectionHeader(label);

  switch (type) {
    case 'PURPOSE_WHEEL': return fmtPurposeWheel(ctx, d);
    case 'GOLDEN_CIRCLE': return fmtGoldenCircle(ctx, d);
    case 'BRAND_ESSENCE': return fmtBrandEssence(ctx, d);
    case 'BRAND_PROMISE': return fmtBrandPromise(ctx, d);
    case 'MISSION_STATEMENT': return fmtMissionVision(ctx, d);
    case 'BRAND_ARCHETYPE': return fmtBrandArchetype(ctx, d);
    case 'TRANSFORMATIVE_GOALS': return fmtTransformativeGoals(ctx, d);
    case 'BRAND_PERSONALITY': return fmtBrandPersonality(ctx, d);
    case 'BRAND_STORY': return fmtBrandStory(ctx, d);
    case 'BRANDHOUSE_VALUES': return fmtBrandHouseValues(ctx, d);
    case 'ESG': return fmtSocialRelevancy(ctx, d);
    case 'SWOT': return fmtSwot(ctx, d);
    case 'PURPOSE_KOMPAS': return fmtPurposeKompas(ctx, d);
    default: ctx.addWrappedText(JSON.stringify(d, null, 2));
  }
}

function s(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}
function sa(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((i): i is string => typeof i === 'string') : [];
}

function fmtPurposeWheel(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Purpose Statement', s(d.statement));
  ctx.addField('Impact Type', s(d.impactType));
  ctx.addField('Impact Description', s(d.impactDescription));
  ctx.addField('Mechanism Category', s(d.mechanismCategory));
  ctx.addField('Mechanism', s(d.mechanism));
  ctx.addField('Pressure Test', s(d.pressureTest));
}

function fmtGoldenCircle(ctx: PdfCtx, d: Record<string, unknown>) {
  const rings = ['why', 'how', 'what'] as const;
  rings.forEach(ring => {
    const section = d[ring] as Record<string, unknown> | undefined;
    if (!section) return;
    ctx.addField(`${ring.toUpperCase()} — Statement`, s(section.statement));
    ctx.addField(`${ring.toUpperCase()} — Details`, s(section.details));
  });
}

function fmtBrandEssence(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Essence Statement', s(d.essenceStatement));
  ctx.addField('Essence Narrative', s(d.essenceNarrative));
  ctx.addPairs('Value Layers', [
    { label: 'Functional Benefit', value: s(d.functionalBenefit) },
    { label: 'Emotional Benefit', value: s(d.emotionalBenefit) },
    { label: 'Self-Expressive Benefit', value: s(d.selfExpressiveBenefit) },
  ]);
  ctx.addField('Discriminator', s(d.discriminator));
  ctx.addField('Audience Insight', s(d.audienceInsight));
  ctx.addList('Proof Points', sa(d.proofPoints));
  ctx.addList('Attributes', sa(d.attributes));
  const scores = d.validationScores as Record<string, number> | undefined;
  if (scores) {
    ctx.addSectionHeader('Validation Scores');
    ['unique', 'intangible', 'meaningful', 'authentic', 'enduring', 'scalable'].forEach(key => {
      if (typeof scores[key] === 'number') ctx.addField(key, `${scores[key]} / 5`);
    });
  }
}

function fmtBrandPromise(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Promise Statement', s(d.promiseStatement));
  ctx.addField('One-Liner', s(d.promiseOneLiner));
  ctx.addPairs('Value Architecture', [
    { label: 'Functional Value', value: s(d.functionalValue) },
    { label: 'Emotional Value', value: s(d.emotionalValue) },
    { label: 'Self-Expressive Value', value: s(d.selfExpressiveValue) },
  ]);
  ctx.addField('Target Audience', s(d.targetAudience));
  ctx.addField('Core Customer Need', s(d.coreCustomerNeed));
  ctx.addField('Differentiator', s(d.differentiator));
  ctx.addField('Onlyness Statement', s(d.onlynessStatement));
  ctx.addList('Proof Points', sa(d.proofPoints));
  ctx.addList('Measurable Outcomes', sa(d.measurableOutcomes));
}

function fmtMissionVision(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addPairs('Mission', [
    { label: 'Mission Statement', value: s(d.missionStatement) },
    { label: 'One-Liner', value: s(d.missionOneLiner) },
  ]);
  ctx.addPairs('Mission Components', [
    { label: 'For Whom', value: s(d.forWhom) },
    { label: 'What We Do', value: s(d.whatWeDo) },
    { label: 'How We Do It', value: s(d.howWeDoIt) },
  ]);
  ctx.addPairs('Vision', [
    { label: 'Vision Statement', value: s(d.visionStatement) },
    { label: 'Time Horizon', value: s(d.timeHorizon) },
    { label: 'Bold Aspiration', value: s(d.boldAspiration) },
  ]);
  ctx.addPairs('Envisioned Future', [
    { label: 'Desired Future State', value: s(d.desiredFutureState) },
    { label: 'Stakeholder Benefit', value: s(d.stakeholderBenefit) },
  ]);
  ctx.addList('Success Indicators', sa(d.successIndicators));
  ctx.addPairs('Impact & Alignment', [
    { label: 'Impact Goal', value: s(d.impactGoal) },
    { label: 'Values Alignment', value: s(d.valuesAlignment) },
    { label: 'Mission-Vision Tension', value: s(d.missionVisionTension) },
  ]);
}

function fmtBrandArchetype(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Primary Archetype', s(d.primaryArchetype));
  ctx.addField('Sub-Archetype', s(d.subArchetype));
  ctx.addPairs('Core Psychology', [
    { label: 'Core Desire', value: s(d.coreDesire) },
    { label: 'Core Fear', value: s(d.coreFear) },
    { label: 'Brand Goal', value: s(d.brandGoal) },
    { label: 'Strategy', value: s(d.strategy) },
    { label: 'Gift / Talent', value: s(d.giftTalent) },
    { label: 'Shadow / Weakness', value: s(d.shadowWeakness) },
  ]);
  ctx.addField('Brand Voice', s(d.brandVoiceDescription));
  ctx.addList('Voice Adjectives', sa(d.voiceAdjectives));
  ctx.addField('Language Patterns', s(d.languagePatterns));
  const pairs = d.weSayNotThat as Array<{ weSay: string; notThat: string }> | undefined;
  if (pairs && pairs.length > 0) {
    ctx.addSectionHeader('We Say / Not That');
    pairs.forEach(p => ctx.addField(`"${p.weSay}"`, `Not: "${p.notThat}"`));
  }
  ctx.addField('Tone Variations', s(d.toneVariations));
  ctx.addList('Blacklisted Phrases', sa(d.blacklistedPhrases));
  ctx.addPairs('Visual Expression', [
    { label: 'Color Direction', value: s(d.colorDirection) },
    { label: 'Typography Direction', value: s(d.typographyDirection) },
    { label: 'Imagery Style', value: s(d.imageryStyle) },
    { label: 'Visual Motifs', value: s(d.visualMotifs) },
  ]);
  ctx.addPairs('Archetype in Action', [
    { label: 'In Action', value: s(d.archetypeInAction) },
    { label: 'Marketing Expression', value: s(d.marketingExpression) },
    { label: 'Customer Experience', value: s(d.customerExperience) },
    { label: 'Content Strategy', value: s(d.contentStrategy) },
    { label: 'Storytelling Approach', value: s(d.storytellingApproach) },
  ]);
  ctx.addList('Brand Examples', sa(d.brandExamples));
  ctx.addField('Positioning Approach', s(d.positioningApproach));
  ctx.addField('Competitive Landscape', s(d.competitiveLandscape));
}

function fmtTransformativeGoals(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Massive Transformative Purpose', s(d.massiveTransformativePurpose));
  ctx.addField('MTP Narrative', s(d.mtpNarrative));

  const goals = d.goals as Array<Record<string, unknown>> | undefined;
  if (goals && goals.length > 0) {
    goals.forEach((g, i) => {
      ctx.addSectionHeader(`Goal ${i + 1}: ${s(g.title)}`);
      ctx.addField('Description', s(g.description));
      ctx.addField('Impact Domain', s(g.impactDomain));
      ctx.addField('Timeframe', s(g.timeframe));
      ctx.addField('Measurable Commitment', s(g.measurableCommitment));
      ctx.addField('Theory of Change', s(g.theoryOfChange));
      ctx.addField('Timeframe Horizon', s(g.timeframeHorizon));
      if (typeof g.currentProgress === 'number') {
        ctx.addField('Current Progress', `${g.currentProgress}%`);
      }
      const sdgs = g.sdgAlignment as number[] | undefined;
      if (sdgs && sdgs.length > 0) {
        ctx.addField('UN SDG Alignment', sdgs.map(n => `SDG ${n}`).join(', '));
      }
      const milestones = g.milestones as Array<Record<string, unknown>> | undefined;
      if (milestones && milestones.length > 0) {
        ctx.addList('Milestones', milestones.map(m =>
          `${s(m.year)}: ${s(m.target)}${m.achieved ? ' ✓' : ''}`
        ));
      }
    });
  }

  const auth = d.authenticityScores as Record<string, number> | undefined;
  if (auth) {
    ctx.addSectionHeader('Authenticity Assessment');
    ['ambition', 'authenticity', 'clarity', 'measurability', 'integration', 'longevity'].forEach(key => {
      if (typeof auth[key] === 'number') ctx.addField(key, `${auth[key]} / 5`);
    });
  }

  const stakeholders = d.stakeholderImpact as Array<Record<string, unknown>> | undefined;
  if (stakeholders && stakeholders.length > 0) {
    ctx.addSectionHeader('Stakeholder Impact');
    stakeholders.forEach(sh => {
      ctx.addField(s(sh.stakeholder), `${s(sh.role)} — ${s(sh.expectedImpact)}`);
    });
  }

  const integration = d.brandIntegration as Record<string, unknown> | undefined;
  if (integration) {
    ctx.addField('Positioning Link', s(integration.positioningLink));
    ctx.addList('Communication Themes', sa(integration.communicationThemes));
    ctx.addList('Campaign Directions', sa(integration.campaignDirections));
    ctx.addField('Internal Activation', s(integration.internalActivation));
  }
}

function fmtBrandPersonality(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Primary Dimension', s(d.primaryDimension));
  ctx.addField('Secondary Dimension', s(d.secondaryDimension));

  const scores = d.dimensionScores as Record<string, number> | undefined;
  if (scores) {
    ctx.addSectionHeader('Aaker Dimension Scores');
    ['sincerity', 'excitement', 'competence', 'sophistication', 'ruggedness'].forEach(key => {
      if (typeof scores[key] === 'number') ctx.addField(key, `${scores[key]} / 5`);
    });
  }

  const traits = d.personalityTraits as Array<Record<string, unknown>> | undefined;
  if (traits && traits.length > 0) {
    ctx.addSectionHeader('Core Personality Traits');
    traits.forEach(t => {
      ctx.addField(s(t.name), s(t.description));
      if (s(t.weAreThis)) ctx.addField('We Are This', s(t.weAreThis));
      if (s(t.butNeverThat)) ctx.addField('But Never That', s(t.butNeverThat));
    });
  }

  const spectrum = d.spectrumSliders as Record<string, number> | undefined;
  if (spectrum) {
    const labels: Record<string, [string, string]> = {
      friendlyFormal: ['Friendly', 'Formal'],
      energeticThoughtful: ['Energetic', 'Thoughtful'],
      modernTraditional: ['Modern', 'Traditional'],
      innovativeProven: ['Innovative', 'Proven'],
      playfulSerious: ['Playful', 'Serious'],
      inclusiveExclusive: ['Inclusive', 'Exclusive'],
      boldReserved: ['Bold', 'Reserved'],
    };
    ctx.addSectionHeader('Personality Spectrum');
    Object.entries(labels).forEach(([key, [left, right]]) => {
      if (typeof spectrum[key] === 'number') {
        ctx.addField(`${left} ↔ ${right}`, `${spectrum[key]} / 7`);
      }
    });
  }

  const toneDims = d.toneDimensions as Record<string, number> | undefined;
  if (toneDims) {
    const toneLabels: Record<string, [string, string]> = {
      formalCasual: ['Formal', 'Casual'],
      seriousFunny: ['Serious', 'Funny'],
      respectfulIrreverent: ['Respectful', 'Irreverent'],
      matterOfFactEnthusiastic: ['Matter-of-fact', 'Enthusiastic'],
    };
    ctx.addSectionHeader('Tone Dimensions');
    Object.entries(toneLabels).forEach(([key, [left, right]]) => {
      if (typeof toneDims[key] === 'number') {
        ctx.addField(`${left} ↔ ${right}`, `${toneDims[key]} / 7`);
      }
    });
  }

  ctx.addField('Brand Voice', s(d.brandVoiceDescription));
  ctx.addList('Words We Use', sa(d.wordsWeUse));
  ctx.addList('Words We Avoid', sa(d.wordsWeAvoid));
  ctx.addField('Writing Sample', s(d.writingSample));

  const channels = d.channelTones as Record<string, string> | undefined;
  if (channels) {
    ctx.addPairs('Communication Style', [
      { label: 'Website', value: channels.website ?? '' },
      { label: 'Social Media', value: channels.socialMedia ?? '' },
      { label: 'Customer Support', value: channels.customerSupport ?? '' },
      { label: 'Email', value: channels.email ?? '' },
      { label: 'Crisis', value: channels.crisis ?? '' },
    ]);
  }

  ctx.addPairs('Visual Expression', [
    { label: 'Color Direction', value: s(d.colorDirection) },
    { label: 'Typography Direction', value: s(d.typographyDirection) },
    { label: 'Imagery Direction', value: s(d.imageryDirection) },
  ]);
}

function fmtBrandStory(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addPairs('Origin & Belief', [
    { label: 'Origin Story', value: s(d.originStory) },
    { label: 'Founder Motivation', value: s(d.founderMotivation) },
    { label: 'Core Belief', value: s(d.coreBeliefStatement) },
  ]);
  ctx.addPairs('The World We See', [
    { label: 'World Context', value: s(d.worldContext) },
    { label: 'External Problem', value: s(d.customerExternalProblem) },
    { label: 'Internal Problem', value: s(d.customerInternalProblem) },
    { label: 'Philosophical Problem', value: s(d.philosophicalProblem) },
    { label: 'Stakes / Cost of Inaction', value: s(d.stakesCostOfInaction) },
  ]);
  ctx.addPairs('The Brand as Guide', [
    { label: 'Brand Role', value: s(d.brandRole) },
    { label: 'Empathy Statement', value: s(d.empathyStatement) },
    { label: 'Authority Credentials', value: s(d.authorityCredentials) },
  ]);
  ctx.addPairs('Transformation', [
    { label: 'Transformation Promise', value: s(d.transformationPromise) },
    { label: 'Customer Success Vision', value: s(d.customerSuccessVision) },
  ]);
  ctx.addField('ABT Statement', s(d.abtStatement));
  ctx.addList('Brand Themes', sa(d.brandThemes));
  ctx.addList('Emotional Territory', sa(d.emotionalTerritory));
  ctx.addList('Key Narrative Messages', sa(d.keyNarrativeMessages));
  ctx.addField('Narrative Arc', s(d.narrativeArc));
  ctx.addList('Proof Points', sa(d.proofPoints));
  ctx.addList('Values in Action', sa(d.valuesInAction));
  ctx.addList('Brand Milestones', sa(d.brandMilestones));
  ctx.addField('Elevator Pitch', s(d.elevatorPitch));
  ctx.addField('Manifesto', s(d.manifestoText));

  const adaptations = d.audienceAdaptations as Record<string, string> | undefined;
  if (adaptations) {
    ctx.addPairs('Audience Adaptations', [
      { label: 'Customers', value: adaptations.customers ?? '' },
      { label: 'Investors', value: adaptations.investors ?? '' },
      { label: 'Employees', value: adaptations.employees ?? '' },
      { label: 'Partners', value: adaptations.partners ?? '' },
    ]);
  }
}

function fmtBrandHouseValues(ctx: PdfCtx, d: Record<string, unknown>) {
  const fmtVal = (label: string, v: unknown) => {
    const val = v as Record<string, string> | undefined;
    if (!val) return;
    ctx.addField(label, val.name ? `${val.name} — ${val.description || ''}` : '');
  };
  ctx.addSectionHeader('Roots (Anchor Values)');
  fmtVal('Anchor Value 1', d.anchorValue1);
  fmtVal('Anchor Value 2', d.anchorValue2);
  ctx.addSectionHeader('Wings (Aspiration Values)');
  fmtVal('Aspiration Value 1', d.aspirationValue1);
  fmtVal('Aspiration Value 2', d.aspirationValue2);
  ctx.addSectionHeader('Fire (Own Value)');
  fmtVal('Own Value', d.ownValue);
  ctx.addField('Value Tension', s(d.valueTension));
}

function fmtSocialRelevancy(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addField('Impact Statement', s(d.impactStatement));
  ctx.addField('Impact Narrative', s(d.impactNarrative));
  ctx.addField('Activism Level', s(d.activismLevel));

  const formatPillar = (title: string, pillar: unknown) => {
    const p = pillar as { statements?: Array<Record<string, unknown>>; pillarReflection?: string } | undefined;
    if (!p) return;
    ctx.addSectionHeader(title);
    if (p.statements) {
      p.statements.forEach(st => {
        const score = typeof st.score === 'number' ? ` (${st.score}/5)` : '';
        ctx.addField(s(st.text) + score, s(st.evidence));
        if (s(st.target)) ctx.addField('Target', `${s(st.target)} — ${s(st.timeline)}`);
      });
    }
    ctx.addField('Reflection', s(p.pillarReflection));
  };
  formatPillar('Environment (Milieu)', d.milieu);
  formatPillar('People (Mens)', d.mens);
  formatPillar('Society (Maatschappij)', d.maatschappij);

  const auth = d.authenticityScores as Record<string, number> | undefined;
  if (auth) {
    ctx.addSectionHeader('Authenticity Scores');
    ['walkTheTalk', 'transparency', 'consistency', 'stakeholderTrust', 'measurability', 'longTermCommitment'].forEach(key => {
      if (typeof auth[key] === 'number') ctx.addField(key, `${auth[key]} / 5`);
    });
  }
  ctx.addList('Proof Points', sa(d.proofPoints));
  ctx.addList('Certifications', sa(d.certifications));
  ctx.addField('Anti-Greenwashing Statement', s(d.antiGreenwashingStatement));
  const sdgs = d.sdgAlignment as number[] | undefined;
  if (sdgs && sdgs.length > 0) {
    ctx.addField('UN SDG Alignment', sdgs.map(n => `SDG ${n}`).join(', '));
  }
  ctx.addList('Communication Principles', sa(d.communicationPrinciples));
  ctx.addList('Key Stakeholders', sa(d.keyStakeholders));
  ctx.addList('Activation Channels', sa(d.activationChannels));
  ctx.addField('Annual Commitment', s(d.annualCommitment));
}

function fmtSwot(ctx: PdfCtx, d: Record<string, unknown>) {
  ctx.addList('Strengths', sa(d.strengths));
  ctx.addList('Weaknesses', sa(d.weaknesses));
  ctx.addList('Opportunities', sa(d.opportunities));
  ctx.addList('Threats', sa(d.threats));
}

function fmtPurposeKompas(ctx: PdfCtx, d: Record<string, unknown>) {
  const pillars = d.pillars as Record<string, Record<string, unknown>> | undefined;
  if (!pillars) return;
  ['mens', 'milieu', 'maatschappij'].forEach(key => {
    const p = pillars[key];
    if (!p) return;
    ctx.addField(key.charAt(0).toUpperCase() + key.slice(1), `Impact: ${s(p.impact)}`);
    ctx.addField('Description', s(p.description));
  });
}
