'use client';

import { useState, useEffect } from 'react';
import {
  Rocket, Users, Globe, TrendingUp, Target, ShieldCheck,
  CheckCircle, Plus, X, Sparkles, Leaf, HandHeart, BarChart3,
  ArrowRight, Clock, ChevronDown, ChevronUp,
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

const UN_SDGS = [
  { number: 1, name: 'No Poverty' }, { number: 2, name: 'Zero Hunger' },
  { number: 3, name: 'Good Health' }, { number: 4, name: 'Quality Education' },
  { number: 5, name: 'Gender Equality' }, { number: 6, name: 'Clean Water' },
  { number: 7, name: 'Affordable Energy' }, { number: 8, name: 'Decent Work' },
  { number: 9, name: 'Innovation' }, { number: 10, name: 'Reduced Inequalities' },
  { number: 11, name: 'Sustainable Cities' }, { number: 12, name: 'Responsible Consumption' },
  { number: 13, name: 'Climate Action' }, { number: 14, name: 'Life Below Water' },
  { number: 15, name: 'Life on Land' }, { number: 16, name: 'Peace & Justice' },
  { number: 17, name: 'Partnerships' },
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center flex-shrink-0">
            <Rocket className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Massive Transformative Purpose</h2>
            <p className="text-sm text-gray-500">The overarching ambition that drives everything your brand does</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">MTP Statement</label>
              <input
                type="text"
                value={draft.massiveTransformativePurpose}
                onChange={(e) => handleField('massiveTransformativePurpose', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                placeholder="e.g. Accelerate the world's transition to sustainable energy"
                maxLength={150}
              />
              <p className="text-xs text-gray-400 mt-1">{draft.massiveTransformativePurpose.length}/150 characters</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Narrative</label>
              <textarea
                value={draft.mtpNarrative}
                onChange={(e) => handleField('mtpNarrative', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={3}
                placeholder="Why this purpose matters, who it serves, and what world you're building..."
              />
            </div>
          </div>
        ) : d.massiveTransformativePurpose ? (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl px-5 py-4 text-center">
              <p className="text-xl font-bold text-teal-700">{d.massiveTransformativePurpose}</p>
            </div>
            {d.mtpNarrative && (
              <p className="text-sm text-gray-600 leading-relaxed">{d.mtpNarrative}</p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Define your Massive Transformative Purpose...</p>
        )}

        {/* Examples */}
        <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">MTP Examples</p>
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
            <h2 className="text-lg font-bold text-gray-900">Transformative Goals</h2>
            <p className="text-sm text-gray-500">Concrete, measurable commitments that operationalize your MTP</p>
          </div>
          {isEditing && draft.goals.length < 5 && (
            <button onClick={addGoal} className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
              <Plus className="h-4 w-4" /> Add Goal
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
            <h2 className="text-lg font-bold text-gray-900">Authenticity Assessment</h2>
            <p className="text-sm text-gray-500">Evaluate how well your goals align with your brand (Collins + Ismail)</p>
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
                  <span className="text-sm font-semibold text-gray-700">{criterion.label}</span>
                  {value > 0 && <span className="text-xs font-medium text-gray-500">{value}/5</span>}
                </div>
                <p className="text-xs text-gray-400 mb-2">{criterion.question}</p>
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
            <h2 className="text-lg font-bold text-gray-900">Stakeholder Impact</h2>
            <p className="text-sm text-gray-500">Map how each stakeholder group contributes to and benefits from transformation</p>
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
                    <label className="text-xs text-gray-500">Role</label>
                    <input
                      type="text"
                      value={si.role}
                      onChange={(e) => handleStakeholder(i, 'role', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                      placeholder="e.g. Ambassadors & executors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Expected Impact</label>
                    <input
                      type="text"
                      value={si.expectedImpact}
                      onChange={(e) => handleStakeholder(i, 'expectedImpact', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                      placeholder="e.g. Culture, motivation, retention"
                    />
                  </div>
                </div>
              ) : si.role || si.expectedImpact ? (
                <div className="flex items-start gap-4">
                  {si.role && (
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Role</p>
                      <p className="text-sm text-gray-700">{si.role}</p>
                    </div>
                  )}
                  {si.expectedImpact && (
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Impact</p>
                      <p className="text-sm text-gray-700">{si.expectedImpact}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs italic text-gray-400">Define role and expected impact...</p>
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
            <h2 className="text-lg font-bold text-gray-900">Brand Integration</h2>
            <p className="text-sm text-gray-500">How transformative goals drive positioning, campaigns, and internal culture</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Positioning Link */}
          <FieldBlock
            label="Positioning Link"
            description="How do these goals strengthen your market positioning?"
            value={isEditing ? draft.brandIntegration.positioningLink : d.brandIntegration.positioningLink}
            isEditing={isEditing}
            onChange={(v) => handleIntegrationField('positioningLink', v)}
            placeholder="Describe how goals reinforce positioning..."
          />

          {/* Internal Activation */}
          <FieldBlock
            label="Internal Activation"
            description="How do employees become ambassadors of transformation?"
            value={isEditing ? draft.brandIntegration.internalActivation : d.brandIntegration.internalActivation}
            isEditing={isEditing}
            onChange={(v) => handleIntegrationField('internalActivation', v)}
            placeholder="Describe internal activation strategy..."
          />

          {/* Communication Themes */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Communication Themes</p>
            <StringListEditor
              items={isEditing ? draft.brandIntegration.communicationThemes : d.brandIntegration.communicationThemes}
              isEditing={isEditing}
              onAdd={() => addIntegrationListItem('communicationThemes')}
              onUpdate={(i, v) => updateIntegrationListItem('communicationThemes', i, v)}
              onRemove={(i) => removeIntegrationListItem('communicationThemes', i)}
              placeholder="Add a communication theme..."
              emptyText="No communication themes defined"
            />
          </div>

          {/* Campaign Directions */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Campaign Directions</p>
            <StringListEditor
              items={isEditing ? draft.brandIntegration.campaignDirections : d.brandIntegration.campaignDirections}
              isEditing={isEditing}
              onAdd={() => addIntegrationListItem('campaignDirections')}
              onUpdate={(i, v) => updateIntegrationListItem('campaignDirections', i, v)}
              onRemove={(i) => removeIntegrationListItem('campaignDirections', i)}
              placeholder="Add a campaign direction..."
              emptyText="No campaign directions defined"
            />
          </div>
        </div>
      </div>

      {/* ── Background Information ────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start gap-3 mb-3">
          <Sparkles className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-700">About Transformative Goals</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Transformative Goals bridge the gap between brand purpose and actionable strategy.
              Based on Jim Collins&apos; BHAG framework, Salim Ismail&apos;s Massive Transformative Purpose,
              and Jim Stengel&apos;s Brand Ideal research. Brands with a clear transformative purpose grow
              2-4x faster (Stengel 50 study), and 72% of consumers expect companies to drive positive
              social and environmental outcomes (EY).
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-600">Key Frameworks</p>
            <p className="text-xs text-gray-400 mt-1">BHAG (Collins), MTP (Ismail), Brand Ideal (Stengel), Moonshot Thinking (Google X)</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs font-medium text-gray-600">Connection to Other Assets</p>
            <p className="text-xs text-gray-400 mt-1">Purpose Statement (foundation), Mission/Vision (expression), Brand Values (alignment)</p>
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
  const domain = getImpactDomainConfig(goal.impactDomain);
  const DomainIcon = domain.icon;
  const horizon = TIMEFRAME_OPTIONS.find((t) => t.value === goal.timeframeHorizon);

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
              {goal.title || `Goal ${index + 1}`}
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
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(goal.currentProgress, 100)}%` }} />
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
                  <label className="text-xs font-medium text-gray-500">Title</label>
                  <input
                    type="text"
                    value={goal.title}
                    onChange={(e) => onFieldChange('title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    placeholder="e.g. Zero Waste Production"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Description</label>
                  <textarea
                    value={goal.description}
                    onChange={(e) => onFieldChange('description', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    rows={2}
                    placeholder="What this goal entails..."
                  />
                </div>
              </div>

              {/* Impact Domain & Timeframe */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Impact Domain</label>
                  <div className="flex gap-2 mt-1">
                    {IMPACT_DOMAINS.map((d) => {
                      const Icon = d.icon;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => onFieldChange('impactDomain', d.value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            goal.impactDomain === d.value
                              ? `${d.bg} ${d.color} ring-1 ring-current`
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Timeframe</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={goal.timeframe}
                      onChange={(e) => onFieldChange('timeframe', e.target.value)}
                      className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                      placeholder="2030"
                    />
                    <select
                      value={goal.timeframeHorizon}
                      onChange={(e) => onFieldChange('timeframeHorizon', e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    >
                      {TIMEFRAME_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label} ({t.description})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Measurable Commitment */}
              <div>
                <label className="text-xs font-medium text-gray-500">Measurable Commitment</label>
                <input
                  type="text"
                  value={goal.measurableCommitment}
                  onChange={(e) => onFieldChange('measurableCommitment', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  placeholder="e.g. 99% of waste recycled by 2030"
                />
              </div>

              {/* Theory of Change */}
              <div>
                <label className="text-xs font-medium text-gray-500">Theory of Change</label>
                <textarea
                  value={goal.theoryOfChange}
                  onChange={(e) => onFieldChange('theoryOfChange', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  rows={2}
                  placeholder="How brand activity creates this impact..."
                />
              </div>

              {/* Progress */}
              <div>
                <label className="text-xs font-medium text-gray-500">Current Progress ({goal.currentProgress}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={goal.currentProgress}
                  onChange={(e) => onFieldChange('currentProgress', parseInt(e.target.value))}
                  className="mt-1 w-full accent-teal-500"
                />
              </div>

              {/* Milestones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">Milestones</label>
                  <button type="button" onClick={onMilestoneAdd} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700">
                    <Plus className="h-3 w-3" /> Add
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
                        aria-label={ms.achieved ? 'Mark milestone as not achieved' : 'Mark milestone as achieved'}
                      >
                        {ms.achieved && <CheckCircle className="h-5 w-5" />}
                      </button>
                      <input
                        type="number"
                        value={ms.year}
                        onChange={(e) => onMilestoneUpdate(mi, 'year', parseInt(e.target.value, 10) || 0)}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                      />
                      <input
                        type="text"
                        value={ms.target}
                        onChange={(e) => onMilestoneUpdate(mi, 'target', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                        placeholder="Milestone target..."
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
                <label className="text-xs font-medium text-gray-500 mb-2 block">UN SDG Alignment</label>
                <div className="flex flex-wrap gap-1.5">
                  {UN_SDGS.map((sdg) => (
                    <button
                      key={sdg.number}
                      type="button"
                      onClick={() => onSdgToggle(sdg.number)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        goal.sdgAlignment.includes(sdg.number)
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={sdg.name}
                    >
                      {sdg.number}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remove */}
              {canRemove && (
                <button type="button" onClick={onRemove} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600">
                  <X className="h-3.5 w-3.5" /> Remove this goal
                </button>
              )}
            </>
          ) : (
            <>
              {goal.description && <p className="text-sm text-gray-700 leading-relaxed">{goal.description}</p>}

              <div className="grid grid-cols-2 gap-3">
                {goal.measurableCommitment && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">Measurable Commitment</p>
                    <p className="text-sm text-gray-700">{goal.measurableCommitment}</p>
                  </div>
                )}
                {goal.theoryOfChange && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Theory of Change</p>
                    <p className="text-sm text-gray-700">{goal.theoryOfChange}</p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {goal.currentProgress > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-medium text-gray-700">{goal.currentProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.min(goal.currentProgress, 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Milestones */}
              {goal.milestones.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Milestones</p>
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
                  <span className="text-xs text-gray-500">SDGs:</span>
                  <div className="flex gap-1">
                    {[...goal.sdgAlignment].sort((a, b) => a - b).map((sdg) => {
                      const sdgInfo = UN_SDGS.find((s) => s.number === sdg);
                      return (
                        <span key={sdg} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium" title={sdgInfo?.name}>
                          SDG {sdg}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {horizon && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {horizon.label} ({horizon.description})
                  <span className="mx-1">·</span>
                  {domain.label}
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
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
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
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            placeholder={placeholder}
          />
          <button type="button" onClick={() => onRemove(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
        <Plus className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}
