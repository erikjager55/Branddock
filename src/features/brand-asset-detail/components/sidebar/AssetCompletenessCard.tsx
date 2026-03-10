'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import { CircularProgress } from '@/features/personas/components/detail/CircularProgress';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';
import type {
  GoldenCircleFrameworkData,
  PurposeWheelFrameworkData,
  BrandEssenceFrameworkData,
  BrandPromiseFrameworkData,
  MissionVisionFrameworkData,
  BrandArchetypeFrameworkData,
  TransformativeGoalsFrameworkData,
  BrandPersonalityFrameworkData,
  BrandStoryFrameworkData,
  BrandHouseValuesFrameworkData,
  SocialRelevancyFrameworkData,
  SWOTFrameworkData,
  PurposeKompasFrameworkData,
} from '../../types/framework.types';

interface AssetCompletenessCardProps {
  asset: BrandAssetDetail;
}

export interface FieldCheck {
  label: string;
  filled: boolean;
}

/** Minimal shape needed by the completeness calculator */
export interface CompletenessInput {
  description: string;
  frameworkType: string | null;
  frameworkData: unknown;
}

export function getAssetCompletenessFields(asset: CompletenessInput): FieldCheck[] {
  const fields: FieldCheck[] = [];

  // PURPOSE_WHEEL completeness is driven entirely by frameworkData (4 cards)
  // Other frameworks include Description as a base field
  if (asset.frameworkType !== 'PURPOSE_WHEEL') {
    fields.push({ label: 'Description', filled: !!(asset.description && asset.description.length > 0) });
  }

  if (!asset.frameworkType) return fields;

  const data = !asset.frameworkData
    ? null
    : typeof asset.frameworkData === 'string'
      ? JSON.parse(asset.frameworkData as string)
      : asset.frameworkData;

  switch (asset.frameworkType) {
    case 'PURPOSE_WHEEL': {
      const pw = data as PurposeWheelFrameworkData;
      fields.push(
        { label: 'Statement', filled: !!pw?.statement?.trim() },
        { label: 'Impact Type', filled: !!pw?.impactType?.trim() },
        { label: 'Mechanism', filled: !!pw?.mechanism?.trim() },
        { label: 'Pressure Test', filled: !!pw?.pressureTest?.trim() },
      );
      break;
    }
    case 'GOLDEN_CIRCLE': {
      const gc = data as GoldenCircleFrameworkData;
      fields.push(
        { label: 'Why', filled: !!gc?.why?.statement },
        { label: 'How', filled: !!gc?.how?.statement },
        { label: 'What', filled: !!gc?.what?.statement },
      );
      break;
    }
    case 'BRAND_ESSENCE': {
      const be = data as BrandEssenceFrameworkData;
      fields.push(
        { label: 'Essence Statement', filled: !!be?.essenceStatement },
        { label: 'Emotional Benefit', filled: !!be?.emotionalBenefit },
        { label: 'Functional Benefit', filled: !!be?.functionalBenefit },
        { label: 'Self-Expressive Benefit', filled: !!be?.selfExpressiveBenefit },
        { label: 'Discriminator', filled: !!be?.discriminator },
        { label: 'Audience Insight', filled: !!be?.audienceInsight },
        { label: 'Proof Points', filled: Array.isArray(be?.proofPoints) && be.proofPoints.length > 0 },
        { label: 'Attributes', filled: Array.isArray(be?.attributes) && be.attributes.length > 0 },
      );
      break;
    }
    case 'BRAND_PROMISE': {
      const bp = data as BrandPromiseFrameworkData;
      fields.push(
        { label: 'Promise Statement', filled: !!bp?.promiseStatement },
        { label: 'One-Liner', filled: !!bp?.promiseOneLiner },
        { label: 'Functional Value', filled: !!bp?.functionalValue },
        { label: 'Emotional Value', filled: !!bp?.emotionalValue },
        { label: 'Self-Expressive Value', filled: !!bp?.selfExpressiveValue },
        { label: 'Target Audience', filled: !!bp?.targetAudience },
        { label: 'Core Need', filled: !!bp?.coreCustomerNeed },
        { label: 'Differentiator', filled: !!bp?.differentiator },
        { label: 'Onlyness Statement', filled: !!bp?.onlynessStatement },
        { label: 'Proof Points', filled: Array.isArray(bp?.proofPoints) && bp.proofPoints.length > 0 },
        { label: 'Measurable Outcomes', filled: Array.isArray(bp?.measurableOutcomes) && bp.measurableOutcomes.length > 0 },
      );
      break;
    }
    case 'MISSION_STATEMENT': {
      const mv = data as MissionVisionFrameworkData;
      fields.push(
        // Card 1: Mission Statement
        { label: 'Mission Statement', filled: !!mv?.missionStatement },
        { label: 'Mission One-Liner', filled: !!mv?.missionOneLiner },
        // Card 2: Mission Components
        { label: 'For Whom', filled: !!mv?.forWhom },
        { label: 'What We Do', filled: !!mv?.whatWeDo },
        { label: 'How We Do It', filled: !!mv?.howWeDoIt },
        // Card 3: Vision Statement
        { label: 'Vision Statement', filled: !!mv?.visionStatement },
        { label: 'Time Horizon', filled: !!mv?.timeHorizon },
        { label: 'Bold Aspiration', filled: !!mv?.boldAspiration },
        // Card 4: Envisioned Future
        { label: 'Desired Future State', filled: !!mv?.desiredFutureState },
        { label: 'Success Indicators', filled: Array.isArray(mv?.successIndicators) ? mv.successIndicators.filter(Boolean).length > 0 : !!mv?.successIndicators },
        { label: 'Stakeholder Benefit', filled: !!mv?.stakeholderBenefit },
        // Card 5: Impact & Alignment
        { label: 'Impact Goal', filled: !!mv?.impactGoal },
        { label: 'Values Alignment', filled: !!mv?.valuesAlignment },
        { label: 'Mission-Vision Tension', filled: !!mv?.missionVisionTension },
      );
      break;
    }
    case 'BRAND_ARCHETYPE': {
      const ba = data as BrandArchetypeFrameworkData;
      fields.push(
        { label: 'Primary Archetype', filled: !!ba?.primaryArchetype },
        { label: 'Core Desire', filled: !!ba?.coreDesire },
        { label: 'Core Fear', filled: !!ba?.coreFear },
        { label: 'Strategy', filled: !!ba?.strategy },
        { label: 'Shadow / Weakness', filled: !!ba?.shadowWeakness },
        { label: 'Brand Voice', filled: !!ba?.brandVoiceDescription },
        { label: 'Voice Adjectives', filled: Array.isArray(ba?.voiceAdjectives) && ba.voiceAdjectives.length > 0 },
        { label: 'Color Direction', filled: !!ba?.colorDirection },
        { label: 'Imagery Style', filled: !!ba?.imageryStyle },
        { label: 'Marketing Expression', filled: !!ba?.marketingExpression },
        { label: 'Content Strategy', filled: !!ba?.contentStrategy },
        { label: 'Competitive Landscape', filled: !!ba?.competitiveLandscape },
      );
      break;
    }
    case 'TRANSFORMATIVE_GOALS': {
      const tg = data as TransformativeGoalsFrameworkData;
      const goals = tg?.goals ?? [];
      fields.push(
        { label: 'Massive Transformative Purpose', filled: !!tg?.massiveTransformativePurpose },
        { label: 'MTP Narrative', filled: !!tg?.mtpNarrative },
      );
      // Dynamically add goal checks based on actual goals count (1-5)
      const goalCount = Math.max(goals.length, 1);
      for (let i = 0; i < goalCount; i++) {
        fields.push({ label: `Goal ${i + 1}`, filled: !!(goals[i]?.title && goals[i]?.description) });
      }
      fields.push(
        { label: 'Authenticity Assessment', filled: !!(tg?.authenticityScores && Object.values(tg.authenticityScores).some(v => v > 0)) },
        { label: 'Stakeholder Impact', filled: Array.isArray(tg?.stakeholderImpact) && tg.stakeholderImpact.some(s => !!s.role || !!s.expectedImpact) },
        { label: 'Brand Integration', filled: !!tg?.brandIntegration?.positioningLink },
      );
      break;
    }
    case 'BRAND_PERSONALITY': {
      const bpe = data as BrandPersonalityFrameworkData;
      const scores = bpe?.dimensionScores;
      const hasScores = scores && Object.values(scores).some(v => v > 0);
      fields.push(
        { label: 'Dimension Scores', filled: !!hasScores },
        { label: 'Primary Dimension', filled: !!bpe?.primaryDimension },
        { label: 'Personality Traits', filled: (bpe?.personalityTraits?.length ?? 0) >= 3 },
        { label: 'Spectrum Sliders', filled: !!(bpe?.spectrumSliders && Object.values(bpe.spectrumSliders).some(v => v !== 4)) },
        { label: 'Tone Dimensions', filled: !!(bpe?.toneDimensions && Object.values(bpe.toneDimensions).some(v => v !== 4)) },
        { label: 'Brand Voice', filled: !!bpe?.brandVoiceDescription },
        { label: 'Words We Use', filled: Array.isArray(bpe?.wordsWeUse) && bpe.wordsWeUse.length > 0 },
        { label: 'Words We Avoid', filled: Array.isArray(bpe?.wordsWeAvoid) && bpe.wordsWeAvoid.length > 0 },
        { label: 'Writing Sample', filled: !!bpe?.writingSample },
        { label: 'Channel Tones', filled: !!(bpe?.channelTones && Object.values(bpe.channelTones).some(v => !!v)) },
        { label: 'Color Direction', filled: !!bpe?.colorDirection },
        { label: 'Typography Direction', filled: !!bpe?.typographyDirection },
      );
      break;
    }
    case 'BRAND_STORY': {
      const bs = data as BrandStoryFrameworkData;
      fields.push(
        // Card 1: Origin & Belief
        { label: 'Origin Story', filled: !!bs?.originStory },
        { label: 'Core Belief', filled: !!bs?.coreBeliefStatement },
        // Card 2: The World We See
        { label: 'External Problem', filled: !!bs?.customerExternalProblem },
        { label: 'Internal Problem', filled: !!bs?.customerInternalProblem },
        { label: 'Philosophical Problem', filled: !!bs?.philosophicalProblem },
        // Card 3: Brand as Guide
        { label: 'Brand Role', filled: !!bs?.brandRole },
        { label: 'Empathy Statement', filled: !!bs?.empathyStatement },
        { label: 'Authority', filled: !!bs?.authorityCredentials },
        // Card 4: Transformation
        { label: 'Transformation Promise', filled: !!bs?.transformationPromise },
        { label: 'Success Vision', filled: !!bs?.customerSuccessVision },
        // Card 5: Narrative Toolkit
        { label: 'ABT Statement', filled: !!bs?.abtStatement },
        { label: 'Narrative Arc', filled: !!bs?.narrativeArc },
        { label: 'Brand Themes', filled: Array.isArray(bs?.brandThemes) && bs.brandThemes.length > 0 },
        { label: 'Key Messages', filled: Array.isArray(bs?.keyNarrativeMessages) && bs.keyNarrativeMessages.length > 0 },
        // Card 6: Evidence
        { label: 'Proof Points', filled: Array.isArray(bs?.proofPoints) && bs.proofPoints.length > 0 },
        { label: 'Brand Milestones', filled: Array.isArray(bs?.brandMilestones) && bs.brandMilestones.length > 0 },
        // Card 7: Expressions
        { label: 'Elevator Pitch', filled: !!bs?.elevatorPitch },
        { label: 'Manifesto', filled: !!bs?.manifestoText },
      );
      break;
    }
    case 'BRANDHOUSE_VALUES': {
      const bv = data as BrandHouseValuesFrameworkData;
      fields.push(
        { label: 'Anchor Value 1', filled: !!(bv?.anchorValue1?.name && bv?.anchorValue1?.description) },
        { label: 'Anchor Value 2', filled: !!(bv?.anchorValue2?.name && bv?.anchorValue2?.description) },
        { label: 'Aspiration Value 1', filled: !!(bv?.aspirationValue1?.name && bv?.aspirationValue1?.description) },
        { label: 'Aspiration Value 2', filled: !!(bv?.aspirationValue2?.name && bv?.aspirationValue2?.description) },
        { label: 'Own Value', filled: !!(bv?.ownValue?.name && bv?.ownValue?.description) },
        { label: 'Value Tension', filled: !!bv?.valueTension },
      );
      break;
    }
    case 'ESG': {
      const sr = data as SocialRelevancyFrameworkData;
      const milieuScore = sr?.milieu?.statements?.reduce((s, st) => s + (st.score || 0), 0) ?? 0;
      const mensScore = sr?.mens?.statements?.reduce((s, st) => s + (st.score || 0), 0) ?? 0;
      const maatschappijScore = sr?.maatschappij?.statements?.reduce((s, st) => s + (st.score || 0), 0) ?? 0;
      const authScores = sr?.authenticityScores;
      const hasAuth = authScores && Object.values(authScores).some(v => typeof v === 'number' && v > 0);
      fields.push(
        { label: 'Impact Statement', filled: !!sr?.impactStatement },
        { label: 'Impact Narrative', filled: !!sr?.impactNarrative },
        { label: 'Activism Level', filled: !!sr?.activismLevel },
        { label: 'Environment Scores', filled: milieuScore > 0 },
        { label: 'Environment Evidence', filled: !!sr?.milieu?.statements?.some(st => !!st.evidence) },
        { label: 'People Scores', filled: mensScore > 0 },
        { label: 'People Evidence', filled: !!sr?.mens?.statements?.some(st => !!st.evidence) },
        { label: 'Society Scores', filled: maatschappijScore > 0 },
        { label: 'Society Evidence', filled: !!sr?.maatschappij?.statements?.some(st => !!st.evidence) },
        { label: 'Authenticity Assessment', filled: !!hasAuth },
        { label: 'Proof Points', filled: Array.isArray(sr?.proofPoints) && sr.proofPoints.length > 0 },
        { label: 'Certifications', filled: Array.isArray(sr?.certifications) && sr.certifications.length > 0 },
        { label: 'Anti-Greenwashing', filled: !!sr?.antiGreenwashingStatement },
        { label: 'SDG Alignment', filled: Array.isArray(sr?.sdgAlignment) && sr.sdgAlignment.length > 0 },
        { label: 'Communication Principles', filled: Array.isArray(sr?.communicationPrinciples) && sr.communicationPrinciples.length > 0 },
        { label: 'Key Stakeholders', filled: Array.isArray(sr?.keyStakeholders) && sr.keyStakeholders.length > 0 },
        { label: 'Activation Channels', filled: Array.isArray(sr?.activationChannels) && sr.activationChannels.length > 0 },
        { label: 'Annual Commitment', filled: !!sr?.annualCommitment },
      );
      break;
    }
    case 'SWOT': {
      const swot = data as SWOTFrameworkData;
      fields.push(
        { label: 'Strengths', filled: (swot?.strengths?.length ?? 0) > 0 },
        { label: 'Weaknesses', filled: (swot?.weaknesses?.length ?? 0) > 0 },
        { label: 'Opportunities', filled: (swot?.opportunities?.length ?? 0) > 0 },
        { label: 'Threats', filled: (swot?.threats?.length ?? 0) > 0 },
      );
      break;
    }
    case 'PURPOSE_KOMPAS': {
      const pk = (data as PurposeKompasFrameworkData)?.pillars;
      fields.push(
        { label: 'People', filled: !!pk?.mens?.description },
        { label: 'Environment', filled: !!pk?.milieu?.description },
        { label: 'Society', filled: !!pk?.maatschappij?.description },
      );
      break;
    }
  }

  return fields;
}

export function AssetCompletenessCard({ asset }: AssetCompletenessCardProps) {
  const fields = getAssetCompletenessFields(asset);
  const filledCount = fields.filter(f => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <CircularProgress percentage={percentage} size={48} strokeWidth={4} />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Asset Completeness</h3>
          <p className="text-xs text-gray-500">{filledCount}/{fields.length} sections filled</p>
        </div>
      </div>
      <div className="space-y-2">
        {fields.map(field => (
          <div key={field.label} className="flex items-center gap-2 text-xs">
            {field.filled ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            )}
            <span className={field.filled ? 'text-gray-700' : 'text-gray-400'}>{field.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
