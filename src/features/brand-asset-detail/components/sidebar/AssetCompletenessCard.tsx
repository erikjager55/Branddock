'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import { CircularProgress } from '@/features/personas/components/detail/CircularProgress';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';
import type {
  GoldenCircleFrameworkData,
  PurposeWheelFrameworkData,
  BrandEssenceFrameworkData,
  BrandPromiseFrameworkData,
  MissionStatementFrameworkData,
  VisionStatementFrameworkData,
  BrandArchetypeFrameworkData,
  TransformativeGoalsFrameworkData,
  BrandPersonalityFrameworkData,
  BrandStoryFrameworkData,
  BrandHouseValuesFrameworkData,
  ESGFrameworkData,
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

  if (!asset.frameworkType || !asset.frameworkData) return fields;

  const data = typeof asset.frameworkData === 'string'
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
        { label: 'Personality Traits', filled: !!be?.brandPersonalityTraits },
        { label: 'Proof Points', filled: !!be?.proofPoints },
      );
      break;
    }
    case 'BRAND_PROMISE': {
      const bp = data as BrandPromiseFrameworkData;
      fields.push(
        { label: 'Promise Statement', filled: !!bp?.promiseStatement },
        { label: 'Functional Value', filled: !!bp?.functionalValue },
        { label: 'Emotional Value', filled: !!bp?.emotionalValue },
        { label: 'Target Audience', filled: !!bp?.targetAudience },
        { label: 'Differentiator', filled: !!bp?.differentiator },
      );
      break;
    }
    case 'MISSION_STATEMENT': {
      const ms = data as MissionStatementFrameworkData;
      fields.push(
        { label: 'Mission Statement', filled: !!ms?.missionStatement },
        { label: 'What We Do', filled: !!ms?.whatWeDo },
        { label: 'For Whom', filled: !!ms?.forWhom },
        { label: 'How We Do It', filled: !!ms?.howWeDoIt },
        { label: 'Impact Goal', filled: !!ms?.impactGoal },
      );
      break;
    }
    case 'VISION_STATEMENT': {
      const vs = data as VisionStatementFrameworkData;
      fields.push(
        { label: 'Vision Statement', filled: !!vs?.visionStatement },
        { label: 'Time Horizon', filled: !!vs?.timeHorizon },
        { label: 'Desired Future State', filled: !!vs?.desiredFutureState },
        { label: 'Bold Aspiration', filled: !!vs?.boldAspiration },
        { label: 'Success Indicators', filled: !!vs?.successIndicators },
      );
      break;
    }
    case 'BRAND_ARCHETYPE': {
      const ba = data as BrandArchetypeFrameworkData;
      fields.push(
        { label: 'Primary Archetype', filled: !!ba?.primaryArchetype },
        { label: 'Core Desire', filled: !!ba?.coreDesire },
        { label: 'Brand Voice Description', filled: !!ba?.brandVoiceDescription },
        { label: 'Archetype in Action', filled: !!ba?.archetypeInAction },
      );
      break;
    }
    case 'TRANSFORMATIVE_GOALS': {
      const tg = data as TransformativeGoalsFrameworkData;
      const goals = tg?.goals ?? [];
      fields.push(
        { label: 'Massive Transformative Purpose', filled: !!tg?.massiveTransformativePurpose },
        { label: 'Goal 1', filled: !!(goals[0]?.title && goals[0]?.description) },
        { label: 'Goal 2', filled: !!(goals[1]?.title && goals[1]?.description) },
        { label: 'Goal 3', filled: !!(goals[2]?.title && goals[2]?.description) },
      );
      break;
    }
    case 'BRAND_PERSONALITY': {
      const bpe = data as BrandPersonalityFrameworkData;
      fields.push(
        { label: 'Primary Dimension', filled: !!bpe?.primaryDimension },
        { label: 'Personality Traits', filled: (bpe?.personalityTraits?.length ?? 0) >= 3 },
        { label: 'Tone of Voice', filled: !!bpe?.toneOfVoice },
        { label: 'Personality in Practice', filled: !!bpe?.personalityInPractice },
      );
      break;
    }
    case 'BRAND_STORY': {
      const bs = data as BrandStoryFrameworkData;
      fields.push(
        { label: 'Elevator Pitch', filled: !!bs?.elevatorPitch },
        { label: 'The Challenge', filled: !!bs?.theChallenge },
        { label: 'The Solution', filled: !!bs?.theSolution },
        { label: 'The Outcome', filled: !!bs?.theOutcome },
        { label: 'Origin Story', filled: !!bs?.originStory },
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
    // Legacy framework types
    case 'ESG': {
      const pillars = (data as ESGFrameworkData)?.pillars;
      fields.push(
        { label: 'Environmental', filled: !!pillars?.environmental?.description },
        { label: 'Social', filled: !!pillars?.social?.description },
        { label: 'Governance', filled: !!pillars?.governance?.description },
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
