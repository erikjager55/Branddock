'use client';

import { useState, useEffect } from 'react';
import {
  Compass, Users, Eye, Mountain, Target, CheckCircle, Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('brand-asset-detail');
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
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('missionVision.mission.title')}</h2>
            <p className="text-sm text-gray-500">{t('missionVision.mission.subtitle')}</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('missionVision.mission.label')}
              </label>
              <textarea
                value={draft.missionStatement}
                onChange={(e) => handleChange('missionStatement', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                rows={3}
                placeholder={t('missionVision.mission.placeholder')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('missionVision.mission.oneLinerLabel')}
              </label>
              <input
                type="text"
                value={draft.missionOneLiner}
                onChange={(e) => handleChange('missionOneLiner', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                placeholder={t('missionVision.mission.oneLinerPlaceholder')}
              />
            </div>
          </div>
        ) : d.missionStatement || d.missionOneLiner ? (
          <div className="space-y-3">
            {d.missionOneLiner && (
              <div className="bg-primary-50/50 border border-primary-100 rounded-xl px-5 py-4 text-center">
                <p className="text-xl font-bold text-primary-700">{d.missionOneLiner}</p>
              </div>
            )}
            {d.missionStatement && (
              <p className="text-sm text-gray-600 leading-relaxed">{d.missionStatement}</p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">{t('missionVision.mission.empty')}</p>
        )}

        {/* Helper text */}
        <div className="mt-3 bg-primary-50/30 border border-primary-100 rounded-xl p-3">
          <p className="text-xs text-primary italic">
            {t('missionVision.mission.druckerQuote')}
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
            {t('missionVision.mission.examplesToggle')}
          </button>
          {showMissionExamples && (
            <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="space-y-2">
                {MISSION_EXAMPLES.map((ex) => (
                  <div key={ex.brand} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{ex.brand}:</span>
                    <span className="text-xs text-gray-600">{t(`brand-dna:missionExamples.${ex.brand}.statement`, { defaultValue: ex.statement })}</span>
                    <span className="text-xs text-gray-400 italic whitespace-nowrap">({t(`brand-dna:missionExamples.${ex.brand}.analysis`, { defaultValue: ex.analysis })})</span>
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
            <h2 className="text-lg font-bold text-gray-900">{t('missionVision.components.title')}</h2>
            <p className="text-sm text-gray-500">{t('missionVision.components.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock
            label={t('missionVision.components.forWhom.label')}
            description={t('missionVision.components.forWhom.description')}
            value={isEditing ? draft.forWhom : d.forWhom}
            isEditing={isEditing}
            onChange={(v) => handleChange('forWhom', v)}
            placeholder={t('missionVision.components.forWhom.placeholder')}
          />
          <FieldBlock
            label={t('missionVision.components.whatWeDo.label')}
            description={t('missionVision.components.whatWeDo.description')}
            value={isEditing ? draft.whatWeDo : d.whatWeDo}
            isEditing={isEditing}
            onChange={(v) => handleChange('whatWeDo', v)}
            placeholder={t('missionVision.components.whatWeDo.placeholder')}
          />
          <FieldBlock
            label={t('missionVision.components.howWeDoIt.label')}
            description={t('missionVision.components.howWeDoIt.description')}
            value={isEditing ? draft.howWeDoIt : d.howWeDoIt}
            isEditing={isEditing}
            onChange={(v) => handleChange('howWeDoIt', v)}
            placeholder={t('missionVision.components.howWeDoIt.placeholder')}
          />
        </div>

        <div className="mt-4 bg-blue-50/30 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600">{t('missionVision.components.hint')}</p>
        </div>
      </div>

      {/* Card 3: Vision Statement */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Eye className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('missionVision.vision.title')}</h2>
            <p className="text-sm text-gray-500">{t('missionVision.vision.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('missionVision.vision.label')}
                </label>
                <textarea
                  value={draft.visionStatement}
                  onChange={(e) => handleChange('visionStatement', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                  rows={3}
                  placeholder={t('missionVision.vision.placeholder')}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('missionVision.vision.timeHorizonLabel')}
                </label>
                <select
                  value={draft.timeHorizon}
                  onChange={(e) => handleChange('timeHorizon', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                >
                  <option value="">{t('missionVision.vision.timeHorizonSelect')}</option>
                  {TIME_HORIZON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`brand-dna:timeHorizon.${opt.value}.label`, { defaultValue: opt.label })} — {t(`brand-dna:timeHorizon.${opt.value}.description`, { defaultValue: opt.description })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('missionVision.vision.bhagLabel')}
                </label>
                <textarea
                  value={draft.boldAspiration}
                  onChange={(e) => handleChange('boldAspiration', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                  rows={2}
                  placeholder={t('missionVision.vision.bhagPlaceholder')}
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
                <p className="text-sm italic text-gray-400">{t('missionVision.vision.empty')}</p>
              )}
              {d.timeHorizon && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">{t('missionVision.vision.timeHorizonView')}</span>
                  <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    {d.timeHorizon}
                  </span>
                </div>
              )}
              {d.boldAspiration && (
                <div className="border-l-4 border-amber-300 pl-4 py-1">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">{t('missionVision.vision.bhagView')}</p>
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
            {t('missionVision.vision.examplesToggle')}
          </button>
          {showVisionExamples && (
            <div className="mt-2 bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="space-y-2">
                {VISION_EXAMPLES.map((ex) => (
                  <div key={ex.brand} className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{ex.brand}:</span>
                    <span className="text-xs text-gray-600">{t(`brand-dna:visionExamples.${ex.brand}.statement`, { defaultValue: ex.statement })}</span>
                    <span className="text-xs text-gray-400 italic whitespace-nowrap">({t(`brand-dna:visionExamples.${ex.brand}.analysis`, { defaultValue: ex.analysis })})</span>
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
            <h2 className="text-lg font-bold text-gray-900">{t('missionVision.future.title')}</h2>
            <p className="text-sm text-gray-500">{t('missionVision.future.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock
            label={t('missionVision.future.desiredLabel')}
            description={t('missionVision.future.desiredDescription')}
            value={isEditing ? draft.desiredFutureState : d.desiredFutureState}
            isEditing={isEditing}
            onChange={(v) => handleChange('desiredFutureState', v)}
            placeholder={t('missionVision.future.desiredPlaceholder')}
          />

          {/* Success Indicators (string list) */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('missionVision.future.indicatorsLabel')}</p>
            <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 mb-3">
              <p className="text-xs text-amber-600">{t('missionVision.future.indicatorsHint')}</p>
            </div>
            <StringListEditor
              items={isEditing ? draft.successIndicators : d.successIndicators}
              isEditing={isEditing}
              onAdd={addIndicator}
              onUpdate={updateIndicator}
              onRemove={removeIndicator}
              placeholder={t('missionVision.future.indicatorsPlaceholder')}
              emptyText={t('missionVision.future.indicatorsEmpty')}
            />
          </div>

          <FieldBlock
            label={t('missionVision.future.stakeholderLabel')}
            description={t('missionVision.future.stakeholderDescription')}
            value={isEditing ? draft.stakeholderBenefit : d.stakeholderBenefit}
            isEditing={isEditing}
            onChange={(v) => handleChange('stakeholderBenefit', v)}
            placeholder={t('missionVision.future.stakeholderPlaceholder')}
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
            <h2 className="text-lg font-bold text-gray-900">{t('missionVision.impact.title')}</h2>
            <p className="text-sm text-gray-500">{t('missionVision.impact.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldBlock
            label={t('missionVision.impact.goalLabel')}
            description={t('missionVision.impact.goalDescription')}
            value={isEditing ? draft.impactGoal : d.impactGoal}
            isEditing={isEditing}
            onChange={(v) => handleChange('impactGoal', v)}
            placeholder={t('missionVision.impact.goalPlaceholder')}
          />
          <FieldBlock
            label={t('missionVision.impact.valuesLabel')}
            description={t('missionVision.impact.valuesDescription')}
            value={isEditing ? draft.valuesAlignment : d.valuesAlignment}
            isEditing={isEditing}
            onChange={(v) => handleChange('valuesAlignment', v)}
            placeholder={t('missionVision.impact.valuesPlaceholder')}
          />
          <FieldBlock
            label={t('missionVision.impact.tensionLabel')}
            description={t('missionVision.impact.tensionDescription')}
            value={isEditing ? draft.missionVisionTension : d.missionVisionTension}
            isEditing={isEditing}
            onChange={(v) => handleChange('missionVisionTension', v)}
            placeholder={t('missionVision.impact.tensionPlaceholder')}
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
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
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
        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 font-medium"
      >
        <Plus className="h-4 w-4" />
        {t('missionVision.addIndicator')}
      </button>
    </div>
  );
}
