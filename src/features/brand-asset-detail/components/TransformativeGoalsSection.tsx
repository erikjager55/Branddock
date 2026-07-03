'use client';

import { useState, useEffect } from 'react';
import {
  Rocket, Users, Globe, TrendingUp, Target, ShieldCheck,
  CheckCircle, Plus, X, Sparkles, Leaf, HandHeart, BarChart3,
  ArrowRight, Clock, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import type {
  TransformativeGoalsFrameworkData,
  TransformativeGoal,
  ImpactDomain,
  TimeframeHorizon,
  AuthenticityScore,
  StakeholderImpact,
  BrandIntegration,
  GoalMilestone,
} from '../types/framework.types';
import { useTranslation } from 'react-i18next';
import { UN_SDGS } from '../constants/social-relevancy-constants';

// ─── Constants ──────────────────────────────────────────────

const EMPTY_GOAL: TransformativeGoal = {
  title: '',
  description: '',
  impactDomain: 'PEOPLE',
  timeframe: '',
  timeframeHorizon: 'MEDIUM',
  measurableCommitment: '',
  theoryOfChange: '',
  currentProgress: 0,
  milestones: [],
  sdgAlignment: [],
};

const EMPTY_AUTHENTICITY: AuthenticityScore = {
  ambition: 0,
  authenticity: 0,
  clarity: 0,
  measurability: 0,
  integration: 0,
  longevity: 0,
};

const EMPTY_INTEGRATION: BrandIntegration = {
  positioningLink: '',
  communicationThemes: [],
  campaignDirections: [],
  internalActivation: '',
};

const EMPTY_DATA: TransformativeGoalsFrameworkData = {
  massiveTransformativePurpose: '',
  mtpNarrative: '',
  goals: [{ ...EMPTY_GOAL }, { ...EMPTY_GOAL }, { ...EMPTY_GOAL }],
  authenticityScores: { ...EMPTY_AUTHENTICITY },
  stakeholderImpact: [
    { stakeholder: 'Employees', role: '', expectedImpact: '' },
    { stakeholder: 'Customers', role: '', expectedImpact: '' },
    { stakeholder: 'Partners', role: '', expectedImpact: '' },
    { stakeholder: 'Community', role: '', expectedImpact: '' },
    { stakeholder: 'Planet', role: '', expectedImpact: '' },
  ],
  brandIntegration: { ...EMPTY_INTEGRATION },
};

const IMPACT_DOMAINS: { value: ImpactDomain; label: string; icon: typeof Users; color: string; bg: string }[] = [
  { value: 'PEOPLE', label: 'People', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'PLANET', label: 'Planet', icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'PROSPERITY', label: 'Prosperity', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
];

const TIMEFRAME_OPTIONS: { value: TimeframeHorizon; label: string; description: string }[] = [
  { value: 'SHORT', label: 'Short-term', description: '1-3 years' },
  { value: 'MEDIUM', label: 'Medium-term', description: '3-10 years' },
  { value: 'LONG', label: 'Long-term', description: '10-25 years' },
  { value: 'ASPIRATIONAL', label: 'Aspirational', description: 'Ongoing horizon' },
];

const AUTHENTICITY_CRITERIA: { key: keyof AuthenticityScore; label: string; question: string }[] = [
  { key: 'ambition', label: 'Ambition', question: 'Is it bold enough to inspire?' },
  { key: 'authenticity', label: 'Authenticity', question: 'Does it match brand DNA?' },
  { key: 'clarity', label: 'Clarity', question: 'Can anyone understand it?' },
  { key: 'measurability', label: 'Measurability', question: 'Can progress be tracked?' },
  { key: 'integration', label: 'Integration', question: 'Does it drive strategy?' },
  { key: 'longevity', label: 'Longevity', question: 'Will it endure 10+ years?' },
];

const MTP_EXAMPLES = [
  { brand: 'Tesla', mtp: 'Accelerate the world\'s transition to sustainable energy' },
  { brand: 'TED', mtp: 'Ideas worth spreading' },
  { brand: 'IKEA', mtp: 'Create a better everyday life for the many people' },
  { brand: 'Google', mtp: 'Organize the world\'s information' },
];


// ─── Props ──────────────────────────────────────────────────

interface TransformativeGoalsSectionProps {
  data: TransformativeGoalsFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: TransformativeGoalsFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function normalize(raw: TransformativeGoalsFrameworkData | null): TransformativeGoalsFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    goals: Array.isArray(raw.goals) && raw.goals.length > 0
      ? raw.goals.map((g) => ({ ...EMPTY_GOAL, ...g, milestones: Array.isArray(g.milestones) ? g.milestones : [], sdgAlignment: Array.isArray(g.sdgAlignment) ? g.sdgAlignment : [] }))
      : EMPTY_DATA.goals,
    authenticityScores: raw.authenticityScores ? { ...EMPTY_AUTHENTICITY, ...raw.authenticityScores } : { ...EMPTY_AUTHENTICITY },
    stakeholderImpact: Array.isArray(raw.stakeholderImpact) && raw.stakeholderImpact.length > 0
      ? raw.stakeholderImpact
      : EMPTY_DATA.stakeholderImpact,
    brandIntegration: raw.brandIntegration
      ? {
          ...EMPTY_INTEGRATION,
          ...raw.brandIntegration,
          communicationThemes: Array.isArray(raw.brandIntegration.communicationThemes) ? raw.brandIntegration.communicationThemes : [],
          campaignDirections: Array.isArray(raw.brandIntegration.campaignDirections) ? raw.brandIntegration.campaignDirections : [],
        }
      : { ...EMPTY_INTEGRATION },
  };
}

function getImpactDomainConfig(domain: ImpactDomain) {
  return IMPACT_DOMAINS.find((d) => d.value === domain) ?? IMPACT_DOMAINS[0];
}

function getAuthenticityAvg(scores: AuthenticityScore): number {
  const vals = Object.values(scores);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return Math.round((total / vals.length) * 20); // 1-5 → 0-100
}

// ─── Component ──────────────────────────────────────────────

export function TransformativeGoalsSection({ data, isEditing, onUpdate }: TransformativeGoalsSectionProps) {
  const { t } = useTranslation('brand-asset-detail');
  const [draft, setDraft] = useState<TransformativeGoalsFrameworkData>(() => normalize(data));
  const [expandedGoal, setExpandedGoal] = useState<number | null>(0);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const update = (next: TransformativeGoalsFrameworkData) => {
    setDraft(next);
    onUpdate(next);
  };

  const handleField = (field: keyof TransformativeGoalsFrameworkData, value: unknown) => {
    update({ ...draft, [field]: value });
  };

  const handleGoalField = (index: number, field: keyof TransformativeGoal, value: unknown) => {
    const goals = [...draft.goals];
    goals[index] = { ...goals[index], [field]: value };
    update({ ...draft, goals });
  };

  const addGoal = () => {
    update({ ...draft, goals: [...draft.goals, { ...EMPTY_GOAL }] });
  };

  const removeGoal = (index: number) => {
    if (draft.goals.length <= 1) return;
    const goals = draft.goals.filter((_, i) => i !== index);
    update({ ...draft, goals });
    if (expandedGoal === index) setExpandedGoal(null);
  };

  const handleMilestoneAdd = (goalIndex: number) => {
    const goals = [...draft.goals];
    const ms: GoalMilestone = { year: new Date().getFullYear() + 1, target: '', achieved: false };
    goals[goalIndex] = { ...goals[goalIndex], milestones: [...goals[goalIndex].milestones, ms] };
    update({ ...draft, goals });
  };

  const handleMilestoneUpdate = (goalIndex: number, msIndex: number, field: keyof GoalMilestone, value: unknown) => {
    const goals = [...draft.goals];
    const milestones = [...goals[goalIndex].milestones];
    milestones[msIndex] = { ...milestones[msIndex], [field]: value };
    goals[goalIndex] = { ...goals[goalIndex], milestones };
    update({ ...draft, goals });
  };

  const handleMilestoneRemove = (goalIndex: number, msIndex: number) => {
    const goals = [...draft.goals];
    goals[goalIndex] = { ...goals[goalIndex], milestones: goals[goalIndex].milestones.filter((_, i) => i !== msIndex) };
    update({ ...draft, goals });
  };

  const handleSdgToggle = (goalIndex: number, sdgNumber: number) => {
    const goals = [...draft.goals];
    const current = goals[goalIndex].sdgAlignment;
    goals[goalIndex] = {
      ...goals[goalIndex],
      sdgAlignment: current.includes(sdgNumber) ? current.filter((n) => n !== sdgNumber) : [...current, sdgNumber],
    };
    update({ ...draft, goals });
  };

  const handleAuthScore = (key: keyof AuthenticityScore, value: number) => {
    update({ ...draft, authenticityScores: { ...draft.authenticityScores, [key]: value } });
  };

  const handleStakeholder = (index: number, field: keyof StakeholderImpact, value: string) => {
    const si = [...draft.stakeholderImpact];
    si[index] = { ...si[index], [field]: value };
    update({ ...draft, stakeholderImpact: si });
  };

  const handleIntegrationField = (field: keyof BrandIntegration, value: unknown) => {
    update({ ...draft, brandIntegration: { ...draft.brandIntegration, [field]: value } });
  };

  const addIntegrationListItem = (field: 'communicationThemes' | 'campaignDirections') => {
    const current = [...draft.brandIntegration[field], ''];
    handleIntegrationField(field, current);
  };

  const updateIntegrationListItem = (field: 'communicationThemes' | 'campaignDirections', index: number, value: string) => {
    const current = [...draft.brandIntegration[field]];
    current[index] = value;
    handleIntegrationField(field, current);
  };

  const removeIntegrationListItem = (field: 'communicationThemes' | 'campaignDirections', index: number) => {
    const current = draft.brandIntegration[field].filter((_, i) => i !== index);
    handleIntegrationField(field, current);
  };

  const d = normalize(data);
  const authAvg = getAuthenticityAvg(isEditing ? draft.authenticityScores : d.authenticityScores);

  return (
    <div className="space-y-4">
      {/* ── Card 1: Massive Transformative Purpose ─────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-50 to-emerald-50 flex items-center justify-center flex-shrink-0">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('transformativeGoals.mtp.title')}</h2>
            <p className="text-sm text-gray-500">{t('transformativeGoals.mtp.subtitle')}</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transformativeGoals.mtp.statementLabel')}</label>
              <input
                type="text"
                value={draft.massiveTransformativePurpose}
                onChange={(e) => handleField('massiveTransformativePurpose', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                placeholder={t('transformativeGoals.mtp.statementPlaceholder')}
                maxLength={150}
              />
              <p className="text-xs text-gray-400 mt-1">{t('transformativeGoals.mtp.characters', { count: draft.massiveTransformativePurpose.length })}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transformativeGoals.mtp.narrativeLabel')}</label>
              <textarea
                value={draft.mtpNarrative}
                onChange={(e) => handleField('mtpNarrative', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                rows={3}
                placeholder={t('transformativeGoals.mtp.narrativePlaceholder')}
              />
            </div>
          </div>
        ) : d.massiveTransformativePurpose ? (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-100 rounded-xl px-5 py-4 text-center">
              <p className="text-xl font-bold text-primary-700">{d.massiveTransformativePurpose}</p>
            </div>
            {d.mtpNarrative && (
              <p className="text-sm text-gray-600 leading-relaxed">{d.mtpNarrative}</p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">{t('transformativeGoals.mtp.empty')}</p>
        )}

        {/* Examples */}
        <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('transformativeGoals.mtp.examples')}</p>
          <div className="flex flex-wrap gap-2">
            {MTP_EXAMPLES.map((ex) => (
              <span key={ex.brand} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                <span className="font-medium text-gray-700">{ex.brand}:</span>
                <span className="text-gray-500">{ex.mtp}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 2: Transformative Goals ──────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{t('transformativeGoals.goals.title')}</h2>
            <p className="text-sm text-gray-500">{t('transformativeGoals.goals.subtitle')}</p>
          </div>
          {isEditing && draft.goals.length < 5 && (
            <button onClick={addGoal} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 font-medium">
              <Plus className="h-4 w-4" /> {t('transformativeGoals.goals.addGoal')}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {(isEditing ? draft.goals : d.goals).map((goal, i) => (
            <GoalCard
              key={i}
              goal={goal}
              index={i}
              isEditing={isEditing}
              isExpanded={expandedGoal === i}
              onToggleExpand={() => setExpandedGoal(expandedGoal === i ? null : i)}
              onFieldChange={(field, value) => handleGoalField(i, field, value)}
              onRemove={() => removeGoal(i)}
              canRemove={draft.goals.length > 1}
              onMilestoneAdd={() => handleMilestoneAdd(i)}
              onMilestoneUpdate={(msIdx, field, value) => handleMilestoneUpdate(i, msIdx, field, value)}
              onMilestoneRemove={(msIdx) => handleMilestoneRemove(i, msIdx)}
              onSdgToggle={(sdg) => handleSdgToggle(i, sdg)}
            />
          ))}
        </div>
      </div>

      {/* ── Card 3: Authenticity Assessment ───────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{t('transformativeGoals.authenticity.title')}</h2>
            <p className="text-sm text-gray-500">{t('transformativeGoals.authenticity.subtitle')}</p>
          </div>
          {authAvg > 0 && (
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${authAvg >= 80 ? 'text-emerald-600' : authAvg >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                {authAvg}%
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTHENTICITY_CRITERIA.map((criterion) => {
            const value = isEditing ? draft.authenticityScores[criterion.key] : d.authenticityScores[criterion.key];
            return (
              <div key={criterion.key} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{t(`transformativeGoals.authenticity.criteria.${criterion.key}.label`)}</span>
                  {value > 0 && <span className="text-xs font-medium text-gray-500">{value}/5</span>}
                </div>
                <p className="text-xs text-gray-400 mb-2">{t(`transformativeGoals.authenticity.criteria.${criterion.key}.question`)}</p>
                {isEditing ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleAuthScore(criterion.key, n)}
                        className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                          value >= n
                            ? 'bg-violet-500 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-2 flex-1 rounded-full ${
                          value >= n ? 'bg-violet-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card 4: Stakeholder Impact Map ────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <HandHeart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('transformativeGoals.stakeholder.title')}</h2>
            <p className="text-sm text-gray-500">{t('transformativeGoals.stakeholder.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-3">
          {(isEditing ? draft.stakeholderImpact : d.stakeholderImpact).map((si, i) => (
            <div key={si.stakeholder} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">{si.stakeholder}</span>
              </div>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">{t('transformativeGoals.stakeholder.roleLabel')}</label>
                    <input
                      type="text"
                      value={si.role}
                      onChange={(e) => handleStakeholder(i, 'role', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      placeholder={t('transformativeGoals.stakeholder.rolePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('transformativeGoals.stakeholder.impactLabel')}</label>
                    <input
                      type="text"
                      value={si.expectedImpact}
                      onChange={(e) => handleStakeholder(i, 'expectedImpact', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      placeholder={t('transformativeGoals.stakeholder.impactPlaceholder')}
                    />
                  </div>
                </div>
              ) : si.role || si.expectedImpact ? (
                <div className="flex items-start gap-4">
                  {si.role && (
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">{t('transformativeGoals.stakeholder.roleView')}</p>
                      <p className="text-sm text-gray-700">{si.role}</p>
                    </div>
                  )}
                  {si.expectedImpact && (
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">{t('transformativeGoals.stakeholder.impactView')}</p>
                      <p className="text-sm text-gray-700">{si.expectedImpact}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs italic text-gray-400">{t('transformativeGoals.stakeholder.empty')}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 5: Brand Integration ─────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <Globe className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('transformativeGoals.integration.title')}</h2>
            <p className="text-sm text-gray-500">{t('transformativeGoals.integration.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Positioning Link */}
          <FieldBlock
            label={t('transformativeGoals.integration.positioningLabel')}
            description={t('transformativeGoals.integration.positioningDescription')}
            value={isEditing ? draft.brandIntegration.positioningLink : d.brandIntegration.positioningLink}
            isEditing={isEditing}
            onChange={(v) => handleIntegrationField('positioningLink', v)}
            placeholder={t('transformativeGoals.integration.positioningPlaceholder')}
          />

          {/* Internal Activation */}
          <FieldBlock
            label={t('transformativeGoals.integration.internalLabel')}
            description={t('transformativeGoals.integration.internalDescription')}
            value={isEditing ? draft.brandIntegration.internalActivation : d.brandIntegration.internalActivation}
            isEditing={isEditing}
            onChange={(v) => handleIntegrationField('internalActivation', v)}
            placeholder={t('transformativeGoals.integration.internalPlaceholder')}
          />

          {/* Communication Themes */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('transformativeGoals.integration.commThemesLabel')}</p>
            <StringListEditor
              items={isEditing ? draft.brandIntegration.communicationThemes : d.brandIntegration.communicationThemes}
              isEditing={isEditing}
              onAdd={() => addIntegrationListItem('communicationThemes')}
              onUpdate={(i, v) => updateIntegrationListItem('communicationThemes', i, v)}
              onRemove={(i) => removeIntegrationListItem('communicationThemes', i)}
              placeholder={t('transformativeGoals.integration.commThemesPlaceholder')}
              emptyText={t('transformativeGoals.integration.commThemesEmpty')}
            />
          </div>

          {/* Campaign Directions */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('transformativeGoals.integration.campaignLabel')}</p>
            <StringListEditor
              items={isEditing ? draft.brandIntegration.campaignDirections : d.brandIntegration.campaignDirections}
              isEditing={isEditing}
              onAdd={() => addIntegrationListItem('campaignDirections')}
              onUpdate={(i, v) => updateIntegrationListItem('campaignDirections', i, v)}
              onRemove={(i) => removeIntegrationListItem('campaignDirections', i)}
              placeholder={t('transformativeGoals.integration.campaignPlaceholder')}
              emptyText={t('transformativeGoals.integration.campaignEmpty')}
            />
          </div>
        </div>
      </div>

      {/* ── Background Information ────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{t('transformativeGoals.about.title')}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {t('transformativeGoals.about.body')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-600">{t('transformativeGoals.about.frameworksLabel')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('transformativeGoals.about.frameworksValue')}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-600">{t('transformativeGoals.about.connectionsLabel')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('transformativeGoals.about.connectionsValue')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GoalCard ───────────────────────────────────────────────

interface GoalCardProps {
  goal: TransformativeGoal;
  index: number;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onFieldChange: (field: keyof TransformativeGoal, value: unknown) => void;
  onRemove: () => void;
  canRemove: boolean;
  onMilestoneAdd: () => void;
  onMilestoneUpdate: (msIdx: number, field: keyof GoalMilestone, value: unknown) => void;
  onMilestoneRemove: (msIdx: number) => void;
  onSdgToggle: (sdg: number) => void;
}

function GoalCard({
  goal, index, isEditing, isExpanded, onToggleExpand, onFieldChange,
  onRemove, canRemove, onMilestoneAdd, onMilestoneUpdate, onMilestoneRemove, onSdgToggle,
}: GoalCardProps) {
  const { t } = useTranslation('brand-asset-detail');
  const domain = getImpactDomainConfig(goal.impactDomain);
  const DomainIcon = domain.icon;
  const horizon = TIMEFRAME_OPTIONS.find((opt) => opt.value === goal.timeframeHorizon);

  return (
    <div className={`border rounded-xl transition-colors ${isExpanded ? 'border-gray-300 bg-white' : 'border-gray-100 bg-gray-50/50'}`}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`h-8 w-8 rounded-lg ${domain.bg} flex items-center justify-center flex-shrink-0`}>
          <DomainIcon className={`h-4 w-4 ${domain.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {goal.title || t('transformativeGoals.goalCard.goalNumber', { number: index + 1 })}
            </span>
            {goal.timeframe && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
                {goal.timeframe}
              </span>
            )}
          </div>
          {goal.measurableCommitment && !isExpanded && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{goal.measurableCommitment}</p>
          )}
        </div>
        {goal.currentProgress > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(goal.currentProgress, 100)}%` }} />
            </div>
            <span className="text-xs text-gray-500">{goal.currentProgress}%</span>
          </div>
        )}
        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          {isEditing ? (
            <>
              {/* Title & Description */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.titleLabel')}</label>
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => onFieldChange('title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    placeholder={t('transformativeGoals.goalCard.titlePlaceholder')}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.descriptionLabel')}</label>
                  <textarea
                    value={goal.description}
                    onChange={(e) => onFieldChange('description', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    rows={2}
                    placeholder={t('transformativeGoals.goalCard.descriptionPlaceholder')}
                  />
                </div>
              </div>

              {/* Impact Domain & Timeframe */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.impactDomainLabel')}</label>
                  <div className="flex gap-2 mt-1">
                    {IMPACT_DOMAINS.map((dom) => {
                      const Icon = dom.icon;
                      return (
                        <button
                          key={dom.value}
                          type="button"
                          onClick={() => onFieldChange('impactDomain', dom.value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            goal.impactDomain === dom.value
                              ? `${dom.bg} ${dom.color} ring-1 ring-current`
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {t(`transformativeGoals.domains.${dom.value}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.timeframeLabel')}</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={goal.timeframe}
                      onChange={(e) => onFieldChange('timeframe', e.target.value)}
                      className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      placeholder={t('transformativeGoals.goalCard.timeframeYearPlaceholder')}
                    />
                    <select
                      value={goal.timeframeHorizon}
                      onChange={(e) => onFieldChange('timeframeHorizon', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      {TIMEFRAME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{t(`transformativeGoals.timeframes.${opt.value}.label`)} ({t(`transformativeGoals.timeframes.${opt.value}.description`)})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Measurable Commitment */}
              <div>
                <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.commitmentLabel')}</label>
                <input
                  type="text"
                  value={goal.measurableCommitment}
                  onChange={(e) => onFieldChange('measurableCommitment', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                  placeholder={t('transformativeGoals.goalCard.commitmentPlaceholder')}
                />
              </div>

              {/* Theory of Change */}
              <div>
                <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.theoryLabel')}</label>
                <textarea
                  value={goal.theoryOfChange}
                  onChange={(e) => onFieldChange('theoryOfChange', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                  rows={2}
                  placeholder={t('transformativeGoals.goalCard.theoryPlaceholder')}
                />
              </div>

              {/* Progress */}
              <div>
                <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.progressLabel', { progress: goal.currentProgress })}</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={goal.currentProgress}
                  onChange={(e) => onFieldChange('currentProgress', parseInt(e.target.value))}
                  className="mt-1 w-full accent-primary-500"
                />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">{t('transformativeGoals.goalCard.milestonesLabel')}</label>
                  <button type="button" onClick={onMilestoneAdd} className="flex items-center gap-1 text-xs text-primary hover:text-primary-700">
                    <Plus className="h-3 w-3" /> {t('shared.add')}
                  </button>
                </div>
                <div className="space-y-2">
                  {goal.milestones.map((ms, mi) => (
                    <div key={mi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onMilestoneUpdate(mi, 'achieved', !ms.achieved)}
                        className={`flex-shrink-0 h-5 w-5 rounded border transition-colors ${
                          ms.achieved ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        aria-label={ms.achieved ? t('transformativeGoals.goalCard.markNotAchieved') : t('transformativeGoals.goalCard.markAchieved')}
                      >
                        {ms.achieved && <CheckCircle className="h-5 w-5" />}
                      </button>
                      <input
                        type="number"
                        value={ms.year}
                        onChange={(e) => onMilestoneUpdate(mi, 'year', parseInt(e.target.value, 10) || 0)}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                      <input
                        type="text"
                        value={ms.target}
                        onChange={(e) => onMilestoneUpdate(mi, 'target', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        placeholder={t('transformativeGoals.goalCard.milestoneTargetPlaceholder')}
                      />
                      <button type="button" onClick={() => onMilestoneRemove(mi)} className="p-1 text-gray-400 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SDG Alignment */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">{t('transformativeGoals.goalCard.sdgLabel')}</label>
                {/* SDG cross-reference */}
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg mb-2">
                  <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">{t('transformativeGoals.goalCard.sdgCrossRef')}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {UN_SDGS.map((sdg) => {
                    const selected = goal.sdgAlignment.includes(sdg.number);
                    return (
                      <button
                        key={sdg.number}
                        type="button"
                        onClick={() => onSdgToggle(sdg.number)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          selected
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        style={selected ? { backgroundColor: sdg.color } : undefined}
                        title={sdg.name}
                      >
                        {sdg.number}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remove */}
              {canRemove && (
                <button type="button" onClick={onRemove} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600">
                  <X className="h-3.5 w-3.5" /> {t('transformativeGoals.goalCard.removeGoal')}
                </button>
              )}
            </>
          ) : (
            <>
              {goal.description && <p className="text-sm text-gray-700 leading-relaxed">{goal.description}</p>}

              <div className="grid grid-cols-2 gap-3">
                {goal.measurableCommitment && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">{t('transformativeGoals.goalCard.commitmentView')}</p>
                    <p className="text-sm text-gray-700">{goal.measurableCommitment}</p>
                  </div>
                )}
                {goal.theoryOfChange && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-700 mb-1">{t('transformativeGoals.goalCard.theoryView')}</p>
                    <p className="text-sm text-gray-700">{goal.theoryOfChange}</p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {goal.currentProgress > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{t('transformativeGoals.goalCard.progressView')}</span>
                    <span className="text-xs font-medium text-gray-700">{goal.currentProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${Math.min(goal.currentProgress, 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Milestones */}
              {goal.milestones.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">{t('transformativeGoals.goalCard.milestonesView')}</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[...goal.milestones].sort((a, b) => a.year - b.year).map((ms, mi) => (
                      <div key={mi} className="flex items-center gap-1.5 flex-shrink-0">
                        {mi > 0 && <ArrowRight className="h-3 w-3 text-gray-300" />}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                          ms.achieved ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'
                        }`}>
                          {ms.achieved ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          <span className="font-medium">{ms.year}</span>
                          {ms.target && <span className="text-gray-500">— {ms.target}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SDG Tags */}
              {goal.sdgAlignment.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t('transformativeGoals.goalCard.sdgsView')}</span>
                  <div className="flex gap-1">
                    {[...goal.sdgAlignment].sort((a, b) => a - b).map((sdg) => {
                      const sdgInfo = UN_SDGS.find((s) => s.number === sdg);
                      return (
                        <span
                          key={sdg}
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: sdgInfo?.color ?? '#0d9488' }}
                          title={sdgInfo?.name}
                        >
                          {t('transformativeGoals.goalCard.sdgTag', { number: sdg })}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {horizon && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t(`transformativeGoals.timeframes.${horizon.value}.label`)} ({t(`transformativeGoals.timeframes.${horizon.value}.description`)})
                  <span className="mx-1">·</span>
                  {t(`transformativeGoals.domains.${domain.value}`)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

interface FieldBlockProps {
  label: string;
  description: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  placeholder: string;
}

function FieldBlock({ label, description, value, isEditing, onChange, placeholder }: FieldBlockProps) {
  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
      <div className="mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-400 ml-2">{description}</span>
      </div>
      {isEditing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
          rows={2}
          placeholder={placeholder}
        />
      ) : value ? (
        <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm italic text-gray-400">{placeholder}</p>
      )}
    </div>
  );
}

interface StringListEditorProps {
  items: string[];
  isEditing: boolean;
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  emptyText: string;
}

function StringListEditor({ items, isEditing, onAdd, onUpdate, onRemove, placeholder, emptyText }: StringListEditorProps) {
  const { t } = useTranslation('brand-asset-detail');
  if (!isEditing) {
    if (items.filter(Boolean).length === 0) {
      return <p className="text-sm italic text-gray-400">{emptyText}</p>;
    }
    return (
      <div className="space-y-1.5">
        {items.filter(Boolean).map((item, i) => (
          <div key={`${i}-${item}`} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">{item}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => onUpdate(i, e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            placeholder={placeholder}
          />
          <button type="button" onClick={() => onRemove(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 font-medium">
        <Plus className="h-4 w-4" /> {t('shared.addItem')}
      </button>
    </div>
  );
}
