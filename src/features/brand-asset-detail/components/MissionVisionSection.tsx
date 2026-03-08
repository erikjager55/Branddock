'use client';

import { useState, useEffect } from 'react';
import {
  Compass, Users, Eye, Mountain, Target, CheckCircle, Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { MissionVisionFrameworkData } from '../types/framework.types';
import {
  TIME_HORIZON_OPTIONS,
  MISSION_EXAMPLES,
  VISION_EXAMPLES,
} from '../constants/mission-vision-constants';

// ─── Constants ──────────────────────────────────────────────

const EMPTY_DATA: MissionVisionFrameworkData = {
  missionStatement: '',
  missionOneLiner: '',
  forWhom: '',
  whatWeDo: '',
  howWeDoIt: '',
  visionStatement: '',
  timeHorizon: '',
  boldAspiration: '',
  desiredFutureState: '',
  successIndicators: [],
  stakeholderBenefit: '',
  impactGoal: '',
  valuesAlignment: '',
  missionVisionTension: '',
};

// ─── Props ──────────────────────────────────────────────────

interface MissionVisionSectionProps {
  data: MissionVisionFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: MissionVisionFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

/** Normalize legacy data (successIndicators string → string[], missing new fields). */
function normalize(raw: MissionVisionFrameworkData | null): MissionVisionFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    missionOneLiner: raw.missionOneLiner ?? '',
    stakeholderBenefit: raw.stakeholderBenefit ?? '',
    valuesAlignment: raw.valuesAlignment ?? '',
    missionVisionTension: raw.missionVisionTension ?? '',
    successIndicators: Array.isArray(raw.successIndicators)
      ? raw.successIndicators
      : typeof raw.successIndicators === 'string' && raw.successIndicators
        ? [raw.successIndicators]
        : [],
  };
}

// ─── Component ──────────────────────────────────────────────

/** Mission & Vision canvas with 5 sections based on Collins & Porras / Drucker. */
export function MissionVisionSection({ data, isEditing, onUpdate }: MissionVisionSectionProps) {
  const [draft, setDraft] = useState<MissionVisionFrameworkData>(() => normalize(data));
  const [showMissionExamples, setShowMissionExamples] = useState(false);
  const [showVisionExamples, setShowVisionExamples] = useState(false);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleChange = (field: keyof MissionVisionFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  const addIndicator = () => {
    handleChange('successIndicators', [...draft.successIndicators, '']);
  };

  const updateIndicator = (index: number, value: string) => {
    const updated = [...draft.successIndicators];
    updated[index] = value;
    handleChange('successIndicators', updated);
  };

  const removeIndicator = (index: number) => {
    handleChange('successIndicators', draft.successIndicators.filter((_, i) => i !== index));
  };

  const d = normalize(data);

  return (
    <div className="space-y-4">
      {/* Card 1: Mission Statement */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Compass className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mission Statement</h2>
            <p className="text-sm text-gray-500">Why your organization exists and what it does</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mission Statement
              </label>
              <textarea
                value={draft.missionStatement}
                onChange={(e) => handleChange('missionStatement', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={3}
                placeholder="Your full mission statement (1-3 sentences)..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                One-Liner
              </label>
              <input
                type="text"
                value={draft.missionOneLiner}
                onChange={(e) => handleChange('missionOneLiner', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                placeholder="Fits on a T-shirt..."
              />
            </div>
          </div>
        ) : d.missionStatement || d.missionOneLiner ? (
          <div className="space-y-3">
            {d.missionOneLiner && (
              <div className="bg-teal-50/50 border border-teal-100 rounded-xl px-5 py-4 text-center">
                <p className="text-xl font-bold text-teal-700">{d.missionOneLiner}</p>
              </div>
            )}
            {d.missionStatement && (
              <p className="text-sm text-gray-600 leading-relaxed">{d.missionStatement}</p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Define your mission...</p>
        )}

        {/* Helper text */}
        <div className="mt-3 bg-teal-50/30 border border-teal-100 rounded-xl p-3">
          <p className="text-xs text-teal-600 italic">
            &ldquo;Peter Drucker: A mission must fit on a T-shirt.&rdquo;
          </p>
        </div>

        {/* Collapsible examples */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowMissionExamples(!showMissionExamples)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showMissionExamples ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Mission Examples
          </button>
          {showMissionExamples && (
            <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="space-y-2">
                {MISSION_EXAMPLES.map((ex) => (
                  <div key={ex.brand} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{ex.brand}:</span>
                    <span className="text-xs text-gray-600">{ex.statement}</span>
                    <span className="text-xs text-gray-400 italic whitespace-nowrap">({ex.analysis})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Mission Components */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mission Components</h2>
            <p className="text-sm text-gray-500">The building blocks: for whom, what, and how differently</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock
            label="For Whom"
            description="Who do you serve?"
            value={isEditing ? draft.forWhom : d.forWhom}
            isEditing={isEditing}
            onChange={(v) => handleChange('forWhom', v)}
            placeholder="Describe your primary audience..."
          />
          <FieldBlock
            label="What We Do"
            description="What do you do?"
            value={isEditing ? draft.whatWeDo : d.whatWeDo}
            isEditing={isEditing}
            onChange={(v) => handleChange('whatWeDo', v)}
            placeholder="Describe your core activity..."
          />
          <FieldBlock
            label="How We Do It"
            description="How do you do it differently?"
            value={isEditing ? draft.howWeDoIt : d.howWeDoIt}
            isEditing={isEditing}
            onChange={(v) => handleChange('howWeDoIt', v)}
            placeholder="Describe your unique approach..."
          />
        </div>

        <div className="mt-4 bg-blue-50/30 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600">A strong mission answers three questions: For whom? What? How differently?</p>
        </div>
      </div>

      {/* Card 3: Vision Statement */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Eye className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Vision Statement</h2>
            <p className="text-sm text-gray-500">The destination: where you are working toward</p>
          </div>
        </div>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vision Statement
                </label>
                <textarea
                  value={draft.visionStatement}
                  onChange={(e) => handleChange('visionStatement', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                  rows={3}
                  placeholder="Your aspirational future state (1-3 sentences)..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Horizon
                </label>
                <select
                  value={draft.timeHorizon}
                  onChange={(e) => handleChange('timeHorizon', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                >
                  <option value="">Select a time horizon...</option>
                  {TIME_HORIZON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bold Aspiration (BHAG)
                </label>
                <textarea
                  value={draft.boldAspiration}
                  onChange={(e) => handleChange('boldAspiration', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                  rows={2}
                  placeholder="Big Hairy Audacious Goal (Collins & Porras)..."
                />
              </div>
            </>
          ) : (
            <>
              {d.visionStatement ? (
                <div className="bg-violet-50/50 border border-violet-100 rounded-xl px-5 py-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{d.visionStatement}</p>
                </div>
              ) : (
                <p className="text-sm italic text-gray-400">Define your vision...</p>
              )}
              {d.timeHorizon && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Time Horizon:</span>
                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    {d.timeHorizon}
                  </span>
                </div>
              )}
              {d.boldAspiration && (
                <div className="border-l-4 border-amber-300 pl-4 py-1">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">BHAG</p>
                  <p className="text-sm text-gray-700 leading-relaxed italic">{d.boldAspiration}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Collapsible examples */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowVisionExamples(!showVisionExamples)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showVisionExamples ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Vision Examples
          </button>
          {showVisionExamples && (
            <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="space-y-2">
                {VISION_EXAMPLES.map((ex) => (
                  <div key={ex.brand} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{ex.brand}:</span>
                    <span className="text-xs text-gray-600">{ex.statement}</span>
                    <span className="text-xs text-gray-400 italic whitespace-nowrap">({ex.analysis})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card 4: Envisioned Future */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Mountain className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Envisioned Future</h2>
            <p className="text-sm text-gray-500">Collins & Porras: a vivid description of success</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock
            label="Desired Future State"
            description="A vivid description of what success looks like"
            value={isEditing ? draft.desiredFutureState : d.desiredFutureState}
            isEditing={isEditing}
            onChange={(v) => handleChange('desiredFutureState', v)}
            placeholder="Paint a vivid picture of the future when your organization has fully succeeded..."
          />

          {/* Success Indicators (string list) */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Success Indicators</p>
            <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 mb-3">
              <p className="text-xs text-amber-600">Concrete, measurable signals that your vision is becoming reality</p>
            </div>
            <StringListEditor
              items={isEditing ? draft.successIndicators : d.successIndicators}
              isEditing={isEditing}
              onAdd={addIndicator}
              onUpdate={updateIndicator}
              onRemove={removeIndicator}
              placeholder="Add a success indicator..."
              emptyText="No success indicators defined yet"
            />
          </div>

          <FieldBlock
            label="Stakeholder Benefit"
            description="Who benefits and how?"
            value={isEditing ? draft.stakeholderBenefit : d.stakeholderBenefit}
            isEditing={isEditing}
            onChange={(v) => handleChange('stakeholderBenefit', v)}
            placeholder="Describe who benefits from your vision and how..."
          />
        </div>
      </div>

      {/* Card 5: Impact & Alignment */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Impact & Alignment</h2>
            <p className="text-sm text-gray-500">The bridge between today and tomorrow</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock
            label="Impact Goal"
            description="Measurable impact today"
            value={isEditing ? draft.impactGoal : d.impactGoal}
            isEditing={isEditing}
            onChange={(v) => handleChange('impactGoal', v)}
            placeholder="What measurable impact are you making right now?"
          />
          <FieldBlock
            label="Values Alignment"
            description="How mission/vision reinforce core values"
            value={isEditing ? draft.valuesAlignment : d.valuesAlignment}
            isEditing={isEditing}
            onChange={(v) => handleChange('valuesAlignment', v)}
            placeholder="How do your mission and vision reinforce your core values?"
          />
          <FieldBlock
            label="Mission-Vision Tension"
            description="Creative tension between present and future"
            value={isEditing ? draft.missionVisionTension : d.missionVisionTension}
            isEditing={isEditing}
            onChange={(v) => handleChange('missionVisionTension', v)}
            placeholder="What is the creative tension between what you do today and where you are going?"
          />
        </div>
      </div>
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
    if (items.length === 0) {
      return <p className="text-sm italic text-gray-400">{emptyText}</p>;
    }
    return (
      <div className="space-y-1.5">
        {items.filter(Boolean).map((item, i) => (
          <div key={i} className="flex items-start gap-2">
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
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
      >
        <Plus className="h-4 w-4" />
        Add indicator
      </button>
    </div>
  );
}
