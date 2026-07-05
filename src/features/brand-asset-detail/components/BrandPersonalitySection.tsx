'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  User, Plus, X, ChevronDown, ChevronUp, Info,
  MessageCircle, Palette, Type, Image, Sliders,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  BrandPersonalityFrameworkData,
  PersonalityTrait,
  AakerDimensionScores,
  PersonalitySpectrumValues,
  ToneDimensions,
  ChannelTones,
} from '../types/framework.types';
import {
  AAKER_DIMENSIONS,
  SPECTRUM_SLIDERS,
  TONE_DIMENSIONS,
  CHANNELS,
  getAakerDimension,
} from '../constants/personality-constants';

// ─── Constants ──────────────────────────────────────────────

const EMPTY_SCORES: AakerDimensionScores = {
  sincerity: 0,
  excitement: 0,
  competence: 0,
  sophistication: 0,
  ruggedness: 0,
};

const EMPTY_SPECTRUM: PersonalitySpectrumValues = {
  friendlyFormal: 4,
  energeticThoughtful: 4,
  modernTraditional: 4,
  innovativeProven: 4,
  playfulSerious: 4,
  inclusiveExclusive: 4,
  boldReserved: 4,
};

const EMPTY_TONE: ToneDimensions = {
  formalCasual: 4,
  seriousFunny: 4,
  respectfulIrreverent: 4,
  matterOfFactEnthusiastic: 4,
};

const EMPTY_CHANNELS: ChannelTones = {
  website: '',
  socialMedia: '',
  customerSupport: '',
  email: '',
  crisis: '',
};

const EMPTY_DATA: BrandPersonalityFrameworkData = {
  dimensionScores: EMPTY_SCORES,
  primaryDimension: '',
  secondaryDimension: '',
  personalityTraits: [],
  spectrumSliders: EMPTY_SPECTRUM,
  toneDimensions: EMPTY_TONE,
  brandVoiceDescription: '',
  wordsWeUse: [],
  wordsWeAvoid: [],
  writingSample: '',
  channelTones: EMPTY_CHANNELS,
  colorDirection: '',
  typographyDirection: '',
  imageryDirection: '',
};

const EMPTY_TRAIT: PersonalityTrait = {
  name: '',
  description: '',
  weAreThis: '',
  butNeverThat: '',
};

const DIMENSION_COLORS: Record<string, { bg: string; text: string; bar: string; ring: string }> = {
  sincerity:      { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500',   ring: 'ring-amber-300' },
  excitement:     { bg: 'bg-red-50',     text: 'text-red-700',     bar: 'bg-red-500',     ring: 'ring-red-300' },
  competence:     { bg: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500',    ring: 'ring-blue-300' },
  sophistication: { bg: 'bg-purple-50',  text: 'text-purple-700',  bar: 'bg-purple-500',  ring: 'ring-purple-300' },
  ruggedness:     { bg: 'bg-stone-100',  text: 'text-stone-700',   bar: 'bg-stone-500',   ring: 'ring-stone-300' },
};

// ─── Props ──────────────────────────────────────────────────

interface BrandPersonalitySectionProps {
  data: BrandPersonalityFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: BrandPersonalityFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function normalize(raw: BrandPersonalityFrameworkData | null): BrandPersonalityFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    dimensionScores: { ...EMPTY_SCORES, ...(raw.dimensionScores ?? {}) },
    spectrumSliders: { ...EMPTY_SPECTRUM, ...(raw.spectrumSliders ?? {}) },
    toneDimensions: { ...EMPTY_TONE, ...(raw.toneDimensions ?? {}) },
    channelTones: { ...EMPTY_CHANNELS, ...(raw.channelTones ?? {}) },
    personalityTraits: Array.isArray(raw.personalityTraits) ? raw.personalityTraits : [],
    wordsWeUse: Array.isArray(raw.wordsWeUse) ? raw.wordsWeUse : [],
    wordsWeAvoid: Array.isArray(raw.wordsWeAvoid) ? raw.wordsWeAvoid : [],
  };
}

/** Derive primary and secondary dimension from scores */
function deriveDimensions(scores: AakerDimensionScores): { primary: string; secondary: string } {
  const entries = Object.entries(scores).filter(([, v]) => v > 0) as [string, number][];
  if (entries.length === 0) return { primary: '', secondary: '' };
  entries.sort((a, b) => b[1] - a[1]);
  return {
    primary: entries[0]?.[0] ?? '',
    secondary: entries[1]?.[0] ?? '',
  };
}

// ─── Component ──────────────────────────────────────────────

/** Brand Personality canvas based on Aaker's 5 Dimensions, NN/g tone, and visual expression. */
export function BrandPersonalitySection({ data, isEditing, onUpdate }: BrandPersonalitySectionProps) {
  const { t } = useTranslation('brand-asset-detail');
  const [draft, setDraft] = useState<BrandPersonalityFrameworkData>(() => normalize(data));
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const commit = (next: BrandPersonalityFrameworkData) => {
    setDraft(next);
    onUpdate(next);
  };

  const handleScoreChange = (key: keyof AakerDimensionScores, value: number) => {
    const nextScores = { ...draft.dimensionScores, [key]: value };
    const { primary, secondary } = deriveDimensions(nextScores);
    commit({
      ...draft,
      dimensionScores: nextScores,
      primaryDimension: primary,
      secondaryDimension: secondary,
    });
  };

  const handleSpectrumChange = (key: keyof PersonalitySpectrumValues, value: number) => {
    commit({ ...draft, spectrumSliders: { ...draft.spectrumSliders, [key]: value } });
  };

  const handleToneChange = (key: keyof ToneDimensions, value: number) => {
    commit({ ...draft, toneDimensions: { ...draft.toneDimensions, [key]: value } });
  };

  const handleChannelChange = (key: keyof ChannelTones, value: string) => {
    commit({ ...draft, channelTones: { ...draft.channelTones, [key]: value } });
  };

  const handleFieldChange = (field: keyof BrandPersonalityFrameworkData, value: unknown) => {
    commit({ ...draft, [field]: value });
  };

  // Trait management
  const addTrait = () => {
    commit({ ...draft, personalityTraits: [...draft.personalityTraits, { ...EMPTY_TRAIT }] });
  };

  const updateTrait = (index: number, field: keyof PersonalityTrait, value: string) => {
    const traits = draft.personalityTraits.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    );
    commit({ ...draft, personalityTraits: traits });
  };

  const removeTrait = (index: number) => {
    commit({ ...draft, personalityTraits: draft.personalityTraits.filter((_, i) => i !== index) });
  };

  // Word list management
  const addWord = (field: 'wordsWeUse' | 'wordsWeAvoid') => {
    commit({ ...draft, [field]: [...draft[field], ''] });
  };

  const updateWord = (field: 'wordsWeUse' | 'wordsWeAvoid', index: number, value: string) => {
    const words = [...draft[field]];
    words[index] = value;
    commit({ ...draft, [field]: words });
  };

  const removeWord = (field: 'wordsWeUse' | 'wordsWeAvoid', index: number) => {
    commit({ ...draft, [field]: draft[field].filter((_, i) => i !== index) });
  };

  const d = normalize(data);

  // Determine primary/secondary for read mode
  const readDimensions = useMemo(() => deriveDimensions(d.dimensionScores), [d.dimensionScores]);
  const primaryDim = d.primaryDimension || readDimensions.primary;
  const primaryInfo = getAakerDimension(primaryDim);

  return (
    <div className="space-y-4">
      {/* ─── Card 1: Aaker Dimension Scores ─── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('brandPersonality.dimensions.title')}</h2>
            <p className="text-sm text-gray-500">
              {t('brandPersonality.dimensions.subtitle')}
            </p>
          </div>
        </div>

        {/* Dimension bars */}
        <div className="space-y-4">
          {AAKER_DIMENSIONS.map((dim) => {
            const score = isEditing
              ? draft.dimensionScores[dim.key as keyof AakerDimensionScores]
              : d.dimensionScores[dim.key as keyof AakerDimensionScores];
            const colors = DIMENSION_COLORS[dim.key] ?? DIMENSION_COLORS.sincerity;
            const isExpanded = expandedDimension === dim.key;
            const dimLabel = t(`brand-dna:aaker.${dim.key}.label`, { defaultValue: dim.label });

            return (
              <div key={dim.key} className={`rounded-xl border border-gray-100 ${colors.bg} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${colors.text}`}>{dimLabel}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedDimension(isExpanded ? null : dim.key)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={isExpanded ? t('brandPersonality.dimensions.collapseInfo', { label: dimLabel }) : t('brandPersonality.dimensions.expandInfo', { label: dimLabel })}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className={`text-sm font-bold ${colors.text}`}>{score || 0}/5</span>
                </div>

                {/* Score bar / input */}
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleScoreChange(dim.key as keyof AakerDimensionScores, val)}
                        className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${
                          val <= score
                            ? `${colors.bar} text-white`
                            : 'bg-white/60 text-gray-400 hover:bg-white'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <div
                        key={val}
                        className={`flex-1 h-2 rounded-full ${val <= score ? colors.bar : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                )}

                {/* Expanded info */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/50 space-y-2">
                    <p className="text-xs text-gray-600">{t(`brand-dna:aaker.${dim.key}.description`, { defaultValue: dim.description })}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dim.facets.map((f) => (
                        <span key={f.name} className="text-xs bg-white/70 rounded-full px-2.5 py-0.5 text-gray-600">
                          {f.name}: {f.traits.join(', ')}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {dim.brandExamples.map((ex) => (
                        <span key={ex} className={`text-xs ${colors.text} bg-white/50 rounded-full px-2 py-0.5 font-medium`}>
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Primary dimension highlight */}
        {primaryDim && primaryInfo && !isEditing && (
          <div className="mt-4 bg-primary-50/50 border border-primary-100 rounded-xl p-4">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
              {t('brandPersonality.dimensions.dominant')}
            </p>
            <p className="text-sm font-semibold text-primary-800">{t(`brand-dna:aaker.${primaryInfo.key}.label`, { defaultValue: primaryInfo.label })}</p>
            <p className="text-xs text-primary mt-0.5">{t(`brand-dna:aaker.${primaryInfo.key}.description`, { defaultValue: primaryInfo.description })}</p>
          </div>
        )}
      </div>

      {/* ─── Card 2: Core Personality Traits ─── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('brandPersonality.traits.title')}</h2>
            <p className="text-sm text-gray-500">
              {t('brandPersonality.traits.subtitle')}
            </p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {draft.personalityTraits.map((trait, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={trait.name}
                    onChange={(e) => updateTrait(i, 'name', e.target.value)}
                    className="text-sm font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-primary-400 outline-none pb-0.5 w-48"
                    placeholder={t('brandPersonality.traits.namePlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => removeTrait(i)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={trait.description}
                  onChange={(e) => updateTrait(i, 'description', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none mb-2"
                  rows={2}
                  placeholder={t('brandPersonality.traits.descriptionPlaceholder')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-emerald-600 mb-1 block">{t('brandPersonality.traits.weAreThis')}</label>
                    <textarea
                      value={trait.weAreThis}
                      onChange={(e) => updateTrait(i, 'weAreThis', e.target.value)}
                      className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-emerald-50/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none"
                      rows={2}
                      placeholder={t('brandPersonality.traits.weArePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-red-500 mb-1 block">{t('brandPersonality.traits.butNever')}</label>
                    <textarea
                      value={trait.butNeverThat}
                      onChange={(e) => updateTrait(i, 'butNeverThat', e.target.value)}
                      className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-red-50/30 focus:border-red-400 focus:ring-1 focus:ring-red-400 resize-none"
                      rows={2}
                      placeholder={t('brandPersonality.traits.butNeverPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            ))}
            {draft.personalityTraits.length < 5 && (
              <button
                type="button"
                onClick={addTrait}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 font-medium"
              >
                <Plus className="h-4 w-4" />
                {t('brandPersonality.traits.add')}
              </button>
            )}
          </div>
        ) : d.personalityTraits.length > 0 ? (
          <div className="space-y-3">
            {d.personalityTraits.filter((t) => t.name).map((trait, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{trait.name}</h3>
                {trait.description && (
                  <p className="text-sm text-gray-600 mb-3">{trait.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {trait.weAreThis && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-emerald-600 mb-1">{t('brandPersonality.traits.weAreThis')}</p>
                      <p className="text-xs text-gray-600">{trait.weAreThis}</p>
                    </div>
                  )}
                  {trait.butNeverThat && (
                    <div className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-500 mb-1">{t('brandPersonality.traits.butNever')}</p>
                      <p className="text-xs text-gray-600">{trait.butNeverThat}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">{t('brandPersonality.traits.empty')}</p>
        )}
      </div>

      {/* ─── Card 3: Personality Spectrum ─── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Sliders className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('brandPersonality.spectrum.title')}</h2>
            <p className="text-sm text-gray-500">
              {t('brandPersonality.spectrum.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {SPECTRUM_SLIDERS.map((slider) => {
            const value = isEditing
              ? draft.spectrumSliders[slider.key as keyof PersonalitySpectrumValues]
              : d.spectrumSliders[slider.key as keyof PersonalitySpectrumValues];

            return (
              <div key={slider.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">{t(`brand-dna:spectrum.${slider.key}.leftLabel`, { defaultValue: slider.leftLabel })}</span>
                  <span className="text-xs font-medium text-gray-700">{t(`brand-dna:spectrum.${slider.key}.rightLabel`, { defaultValue: slider.rightLabel })}</span>
                </div>
                {isEditing ? (
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={value}
                    onChange={(e) =>
                      handleSpectrumChange(
                        slider.key as keyof PersonalitySpectrumValues,
                        Number(e.target.value),
                      )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                ) : (
                  <div className="relative h-2 bg-gray-200 rounded-full">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary-500 border-2 border-white shadow-sm"
                      style={{ left: `${((value - 1) / 6) * 100}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  </div>
                )}
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{t(`brand-dna:spectrum.${slider.key}.leftDescription`, { defaultValue: slider.leftDescription })}</span>
                  <span className="text-[10px] text-gray-400">{t(`brand-dna:spectrum.${slider.key}.rightDescription`, { defaultValue: slider.rightDescription })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice, Tone & Communication Style — migratie-banner verwijderd (ADR 2026-05-15).
          De voice-velden leven volledig in de Brand Voice module. */}

      {/* ─── Card 6: Visual Expression ─── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Palette className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('brandPersonality.visual.title')}</h2>
            <p className="text-sm text-gray-500">
              {t('brandPersonality.visual.subtitle')}
            </p>
          </div>
        </div>

        {/* Reference guidance from primary dimension */}
        {primaryDim && primaryInfo && (
          <div className="bg-violet-50/30 border border-violet-100 rounded-xl p-4 mb-5">
            <p className="text-xs font-medium text-violet-600 uppercase tracking-wider mb-2">
              {t('brandPersonality.visual.guidanceFor', { label: t(`brand-dna:aaker.${primaryInfo.key}.label`, { defaultValue: primaryInfo.label }) })}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-0.5">{t('brandPersonality.visual.color')}</p>
                <p className="text-xs text-gray-500">{t(`brand-dna:aaker.${primaryInfo.key}.colorAssociation`, { defaultValue: primaryInfo.colorAssociation })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-0.5">{t('brandPersonality.visual.typography')}</p>
                <p className="text-xs text-gray-500">{t(`brand-dna:aaker.${primaryInfo.key}.typographyAssociation`, { defaultValue: primaryInfo.typographyAssociation })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-0.5">{t('brandPersonality.visual.imagery')}</p>
                <p className="text-xs text-gray-500">{t(`brand-dna:aaker.${primaryInfo.key}.imageryAssociation`, { defaultValue: primaryInfo.imageryAssociation })}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <VisualField
            icon={Palette}
            iconBg="bg-pink-50"
            iconColor="text-pink-600"
            label={t('brandPersonality.visual.colorLabel')}
            value={isEditing ? draft.colorDirection : d.colorDirection}
            isEditing={isEditing}
            onChange={(v) => handleFieldChange('colorDirection', v)}
            placeholder={t('brandPersonality.visual.colorPlaceholder')}
          />
          <VisualField
            icon={Type}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            label={t('brandPersonality.visual.typographyLabel')}
            value={isEditing ? draft.typographyDirection : d.typographyDirection}
            isEditing={isEditing}
            onChange={(v) => handleFieldChange('typographyDirection', v)}
            placeholder={t('brandPersonality.visual.typographyPlaceholder')}
          />
          <VisualField
            icon={Image}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-600"
            label={t('brandPersonality.visual.imageryLabel')}
            value={isEditing ? draft.imageryDirection : d.imageryDirection}
            isEditing={isEditing}
            onChange={(v) => handleFieldChange('imageryDirection', v)}
            placeholder={t('brandPersonality.visual.imageryPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

interface VisualFieldProps {
  icon: typeof Palette;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  placeholder: string;
}

function VisualField({ icon: Icon, iconBg, iconColor, label, value, isEditing, onChange, placeholder }: VisualFieldProps) {
  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-6 w-6 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
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

interface WordListProps {
  words: string[];
  isEditing: boolean;
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  emptyText: string;
  tagColor: 'emerald' | 'red';
}

function WordList({ words, isEditing, onAdd, onUpdate, onRemove, placeholder, emptyText, tagColor }: WordListProps) {
  const tagClasses = tagColor === 'emerald'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';

  if (!isEditing) {
    if (words.filter(Boolean).length === 0) {
      return <p className="text-xs italic text-gray-400">{emptyText}</p>;
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {words.filter(Boolean).map((word, i) => (
          <span key={i} className={`text-xs border rounded-full px-2.5 py-0.5 ${tagClasses}`}>
            {word}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {words.map((word, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={word}
            onChange={(e) => onUpdate(i, e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </button>
    </div>
  );
}
