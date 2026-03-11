'use client';

import { useState, useEffect } from 'react';
import {
  Diamond, Heart, Package, Sparkles, Target, Users, ShieldCheck, CheckCircle, Plus, X, Info,
} from 'lucide-react';
import type { BrandEssenceFrameworkData, BrandEssenceValidationScores } from '../types/framework.types';

// ─── Constants ──────────────────────────────────────────────

const EMPTY_SCORES: BrandEssenceValidationScores = {
  unique: 0, intangible: 0, meaningful: 0, authentic: 0, enduring: 0, scalable: 0,
};

const EMPTY_DATA: BrandEssenceFrameworkData = {
  essenceStatement: '',
  essenceNarrative: '',
  functionalBenefit: '',
  emotionalBenefit: '',
  selfExpressiveBenefit: '',
  discriminator: '',
  proofPoints: [],
  attributes: [],
  audienceInsight: '',
  validationScores: EMPTY_SCORES,
};

const VALIDATION_CRITERIA: { key: keyof BrandEssenceValidationScores; label: string; description: string }[] = [
  { key: 'unique', label: 'Unique', description: 'Is it ownable and distinctive to your brand?' },
  { key: 'intangible', label: 'Intangible', description: 'Is it beyond a product feature or functional claim?' },
  { key: 'meaningful', label: 'Meaningful', description: 'Does it resonate deeply with your audience?' },
  { key: 'authentic', label: 'Authentic', description: 'Does it reflect the true reality of your brand?' },
  { key: 'enduring', label: 'Enduring', description: 'Will it remain relevant for 10+ years?' },
  { key: 'scalable', label: 'Scalable', description: 'Does it work across markets and categories?' },
];

const ESSENCE_EXAMPLES = [
  { brand: 'Nike', essence: 'Authentic Athletic Performance' },
  { brand: 'Disney', essence: 'Fun Family Entertainment' },
  { brand: 'Volvo', essence: 'Safety' },
  { brand: 'Starbucks', essence: 'Rewarding Everyday Moments' },
  { brand: 'Patagonia', essence: 'Responsible Adventure' },
];

// ─── Props ──────────────────────────────────────────────────

interface BrandEssenceSectionProps {
  data: BrandEssenceFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: BrandEssenceFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

/** Normalize incoming data to ensure arrays and scores exist */
function normalize(raw: BrandEssenceFrameworkData | null): BrandEssenceFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    proofPoints: Array.isArray(raw.proofPoints) ? raw.proofPoints : [],
    attributes: Array.isArray(raw.attributes) ? raw.attributes : [],
    validationScores: raw.validationScores
      ? { ...EMPTY_SCORES, ...raw.validationScores }
      : EMPTY_SCORES,
  };
}

function averageScore(scores: BrandEssenceValidationScores): number {
  const vals = Object.values(scores);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Component ──────────────────────────────────────────────

export function BrandEssenceSection({ data, isEditing, onUpdate }: BrandEssenceSectionProps) {
  const [draft, setDraft] = useState<BrandEssenceFrameworkData>(() => normalize(data));

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleChange = (field: keyof BrandEssenceFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  const handleScoreChange = (key: keyof BrandEssenceValidationScores, value: number) => {
    const next = { ...draft, validationScores: { ...draft.validationScores, [key]: value } };
    setDraft(next);
    onUpdate(next);
  };

  const addListItem = (field: 'proofPoints' | 'attributes') => {
    const current = [...draft[field], ''];
    handleChange(field, current);
  };

  const updateListItem = (field: 'proofPoints' | 'attributes', index: number, value: string) => {
    const current = [...draft[field]];
    current[index] = value;
    handleChange(field, current);
  };

  const removeListItem = (field: 'proofPoints' | 'attributes', index: number) => {
    const current = draft[field].filter((_, i) => i !== index);
    handleChange(field, current);
  };

  const d = normalize(data);
  const avg = averageScore(isEditing ? draft.validationScores : d.validationScores);

  return (
    <div className="space-y-4">
      {/* Card 1: Essence Core */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Diamond className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Brand Essence</h2>
            <p className="text-sm text-gray-500">The single most defining thought about your brand — timeless, in 1-3 words</p>
          </div>
        </div>

        {/* Essence Statement */}
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Essence Statement (adj-adj-noun format)
              </label>
              <input
                type="text"
                value={draft.essenceStatement}
                onChange={(e) => handleChange('essenceStatement', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                placeholder="e.g. Authentic Athletic Performance"
              />
            </div>
            <textarea
              value={draft.essenceNarrative}
              onChange={(e) => handleChange('essenceNarrative', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
              rows={3}
              placeholder="Explain in 2-3 sentences what this essence means for your brand..."
            />
          </div>
        ) : d.essenceStatement ? (
          <div className="space-y-3">
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl px-5 py-4 text-center">
              <p className="text-2xl font-bold text-teal-700">{d.essenceStatement}</p>
            </div>
            {d.essenceNarrative && (
              <p className="text-sm text-gray-600 leading-relaxed">{d.essenceNarrative}</p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Define your brand essence...</p>
        )}

        {/* Examples */}
        <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Examples</p>
          <div className="flex flex-wrap gap-2">
            {ESSENCE_EXAMPLES.map((ex) => (
              <span key={ex.brand} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                <span className="font-medium text-gray-700">{ex.brand}:</span>
                <span className="text-gray-500">{ex.essence}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: Benefits (3 sub-sections) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Benefits</h2>
            <p className="text-sm text-gray-500">What your brand delivers across three dimensions</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            These describe who your brand <strong>IS</strong> at its core. For customer-facing commitments, see Brand Promise.
          </p>
        </div>

        <div className="space-y-4">
          {/* Functional Benefit */}
          <BenefitField
            icon={Package}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Functional Benefit"
            description="What tangible quality is inseparable from your brand identity?"
            value={isEditing ? draft.functionalBenefit : d.functionalBenefit}
            isEditing={isEditing}
            onChange={(v) => handleChange('functionalBenefit', v)}
            placeholder="Describe the tangible value your brand delivers..."
          />

          {/* Emotional Benefit */}
          <BenefitField
            icon={Heart}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            label="Emotional Benefit"
            description="What feeling is intrinsically part of who you are?"
            value={isEditing ? draft.emotionalBenefit : d.emotionalBenefit}
            isEditing={isEditing}
            onChange={(v) => handleChange('emotionalBenefit', v)}
            placeholder="Describe the feeling your brand evokes..."
          />

          {/* Self-Expressive Benefit */}
          <BenefitField
            icon={Sparkles}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            label="Self-Expressive Benefit"
            description="What does your brand enable people to express about themselves?"
            value={isEditing ? draft.selfExpressiveBenefit : d.selfExpressiveBenefit}
            isEditing={isEditing}
            onChange={(v) => handleChange('selfExpressiveBenefit', v)}
            placeholder="Describe how customers express their identity through your brand..."
          />
        </div>
      </div>

      {/* Card 3: Discriminator */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Discriminator</h2>
            <p className="text-sm text-gray-500">The single most compelling reason to choose your brand over competitors</p>
          </div>
        </div>

        <div className="bg-violet-50/30 border border-violet-100 rounded-xl p-3 mb-3">
          <p className="text-xs text-violet-600 italic">&ldquo;Only [your brand] can _____ because _____.&rdquo;</p>
        </div>

        {isEditing ? (
          <textarea
            value={draft.discriminator}
            onChange={(e) => handleChange('discriminator', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
            rows={3}
            placeholder="Only [brand] can... because..."
          />
        ) : d.discriminator ? (
          <p className="text-sm text-gray-700 leading-relaxed">{d.discriminator}</p>
        ) : (
          <p className="text-sm italic text-gray-400">Define what makes your brand the only choice...</p>
        )}
      </div>

      {/* Card 4: Audience Insight */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Audience Insight</h2>
            <p className="text-sm text-gray-500">The deep human truth that connects your brand to its audience</p>
          </div>
        </div>

        <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3 mb-3">
          <p className="text-xs text-blue-600">Not who they are, but why they need it — the underlying tension, desire, or unmet need.</p>
        </div>

        {isEditing ? (
          <textarea
            value={draft.audienceInsight}
            onChange={(e) => handleChange('audienceInsight', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
            rows={3}
            placeholder="Describe the deep human truth that connects your brand to its audience..."
          />
        ) : d.audienceInsight ? (
          <div className="border-l-4 border-blue-300 pl-4 py-1">
            <p className="text-sm text-gray-700 leading-relaxed italic">{d.audienceInsight}</p>
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Describe the deep human truth...</p>
        )}
      </div>

      {/* Card 5: Evidence (Proof Points + Attributes) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Evidence</h2>
            <p className="text-sm text-gray-500">Concrete proof that your brand essence is real</p>
          </div>
        </div>

        {/* Proof Points */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Proof Points</p>
          <StringListEditor
            items={isEditing ? draft.proofPoints : d.proofPoints}
            isEditing={isEditing}
            onAdd={() => addListItem('proofPoints')}
            onUpdate={(i, v) => updateListItem('proofPoints', i, v)}
            onRemove={(i) => removeListItem('proofPoints', i)}
            placeholder="Add a proof point..."
            emptyText="No proof points defined yet"
          />
        </div>

        {/* Attributes */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Brand Attributes</p>
          <StringListEditor
            items={isEditing ? draft.attributes : d.attributes}
            isEditing={isEditing}
            onAdd={() => addListItem('attributes')}
            onUpdate={(i, v) => updateListItem('attributes', i, v)}
            onRemove={(i) => removeListItem('attributes', i)}
            placeholder="Add a brand attribute..."
            emptyText="No attributes defined yet"
          />
        </div>
      </div>

      {/* Card 6: Validation Scores (BrandSTOKE) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Validation Score</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-teal-700">{avg.toFixed(1)}</span>
                <span className="text-xs text-gray-400">/ 5.0</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">Rate your brand essence against 6 key criteria</p>
          </div>
        </div>

        {/* Average bar */}
        <div className="mb-5">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-300"
              style={{ width: `${(avg / 5) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {VALIDATION_CRITERIA.map((criterion) => {
            const value = isEditing
              ? draft.validationScores[criterion.key]
              : d.validationScores[criterion.key];

            return (
              <div key={criterion.key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{criterion.label}</span>
                    <p className="text-xs text-gray-400">{criterion.description}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-600 tabular-nums w-6 text-right">{value}</span>
                </div>
                {isEditing ? (
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={value}
                    onChange={(e) => handleScoreChange(criterion.key, Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-teal-500 cursor-pointer"
                  />
                ) : (
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-all duration-300"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

interface BenefitFieldProps {
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  placeholder: string;
}

function BenefitField({ icon: Icon, iconBg, iconColor, label, description, value, isEditing, onChange, placeholder }: BenefitFieldProps) {
  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-6 w-6 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-xs text-gray-400 ml-2">{description}</span>
        </div>
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
        Add item
      </button>
    </div>
  );
}
