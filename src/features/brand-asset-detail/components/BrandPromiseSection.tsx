'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Heart, Package, Sparkles, Users, Target, ShieldCheck, CheckCircle, Plus, X,
} from 'lucide-react';
import type { BrandPromiseFrameworkData } from '../types/framework.types';

// ─── Constants ──────────────────────────────────────────────

const EMPTY_DATA: BrandPromiseFrameworkData = {
  promiseStatement: '',
  promiseOneLiner: '',
  functionalValue: '',
  emotionalValue: '',
  selfExpressiveValue: '',
  targetAudience: '',
  coreCustomerNeed: '',
  differentiator: '',
  onlynessStatement: '',
  proofPoints: [],
  measurableOutcomes: [],
};

const PROMISE_EXAMPLES = [
  { brand: 'FedEx', promise: 'When it absolutely, positively has to be there overnight' },
  { brand: 'Geico', promise: '15 minutes could save you 15% on car insurance' },
  { brand: 'BMW', promise: 'The Ultimate Driving Machine' },
  { brand: 'Walmart', promise: 'Save money. Live better.' },
  { brand: 'Apple', promise: 'Think different — technology that just works' },
];

// ─── Props ──────────────────────────────────────────────────

interface BrandPromiseSectionProps {
  data: BrandPromiseFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: BrandPromiseFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function normalize(raw: BrandPromiseFrameworkData | null): BrandPromiseFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...raw,
    proofPoints: Array.isArray(raw.proofPoints) ? raw.proofPoints : [],
    measurableOutcomes: Array.isArray(raw.measurableOutcomes) ? raw.measurableOutcomes : [],
  };
}

// ─── Component ──────────────────────────────────────────────

/** Brand Promise canvas with 5 sections based on Keller/Aaker value model. */
export function BrandPromiseSection({ data, isEditing, onUpdate }: BrandPromiseSectionProps) {
  const [draft, setDraft] = useState<BrandPromiseFrameworkData>(() => normalize(data));

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleChange = (field: keyof BrandPromiseFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  const addListItem = (field: 'proofPoints' | 'measurableOutcomes') => {
    const current = [...draft[field], ''];
    handleChange(field, current);
  };

  const updateListItem = (field: 'proofPoints' | 'measurableOutcomes', index: number, value: string) => {
    const current = [...draft[field]];
    current[index] = value;
    handleChange(field, current);
  };

  const removeListItem = (field: 'proofPoints' | 'measurableOutcomes', index: number) => {
    const current = draft[field].filter((_, i) => i !== index);
    handleChange(field, current);
  };

  const d = normalize(data);

  return (
    <div className="space-y-4">
      {/* Card 1: Promise Statement */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Brand Promise</h2>
            <p className="text-sm text-gray-500">The commitment your brand makes to every customer, every time</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Promise Statement
              </label>
              <textarea
                value={draft.promiseStatement}
                onChange={(e) => handleChange('promiseStatement', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={2}
                placeholder="The core promise your brand makes..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                One-Liner
              </label>
              <input
                type="text"
                value={draft.promiseOneLiner}
                onChange={(e) => handleChange('promiseOneLiner', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                placeholder="Distill to a single tagline..."
              />
            </div>
          </div>
        ) : d.promiseStatement || d.promiseOneLiner ? (
          <div className="space-y-3">
            {d.promiseOneLiner && (
              <div className="bg-teal-50/50 border border-teal-100 rounded-xl px-5 py-4 text-center">
                <p className="text-xl font-bold text-teal-700">{d.promiseOneLiner}</p>
              </div>
            )}
            {d.promiseStatement && (
              <p className="text-sm text-gray-600 leading-relaxed">{d.promiseStatement}</p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Define your brand promise...</p>
        )}

        {/* Examples */}
        <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Examples</p>
          <div className="flex flex-wrap gap-2">
            {PROMISE_EXAMPLES.map((ex) => (
              <span key={ex.brand} className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                <span className="font-medium text-gray-700">{ex.brand}:</span>
                <span className="text-gray-500">{ex.promise}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: Value Architecture (3 sub-sections) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <Heart className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Value Architecture</h2>
            <p className="text-sm text-gray-500">Three layers of value your promise delivers (Aaker model)</p>
          </div>
        </div>

        <div className="space-y-4">
          <BenefitField
            icon={Package}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            label="Functional Value"
            description="What tangible benefit do you deliver?"
            value={isEditing ? draft.functionalValue : d.functionalValue}
            isEditing={isEditing}
            onChange={(v) => handleChange('functionalValue', v)}
            placeholder="Describe the tangible, measurable benefit..."
          />

          <BenefitField
            icon={Heart}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            label="Emotional Value"
            description="What feeling does it create?"
            value={isEditing ? draft.emotionalValue : d.emotionalValue}
            isEditing={isEditing}
            onChange={(v) => handleChange('emotionalValue', v)}
            placeholder="Describe the feeling your promise creates..."
          />

          <BenefitField
            icon={Sparkles}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            label="Self-Expressive Value"
            description="How do customers express themselves through your brand?"
            value={isEditing ? draft.selfExpressiveValue : d.selfExpressiveValue}
            isEditing={isEditing}
            onChange={(v) => handleChange('selfExpressiveValue', v)}
            placeholder="Describe how customers express their identity..."
          />
        </div>
      </div>

      {/* Card 3: Audience & Need */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Audience & Need</h2>
            <p className="text-sm text-gray-500">Who you serve and the deep need your promise addresses</p>
          </div>
        </div>

        <div className="space-y-4">
          <BenefitField
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Target Audience"
            description="Who is this promise for?"
            value={isEditing ? draft.targetAudience : d.targetAudience}
            isEditing={isEditing}
            onChange={(v) => handleChange('targetAudience', v)}
            placeholder="Describe your primary target audience..."
          />

          <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3 mb-1">
            <p className="text-xs text-blue-600">Go beyond demographics — what is the deeper, unmet need your promise fulfills?</p>
          </div>

          {isEditing ? (
            <textarea
              value={draft.coreCustomerNeed}
              onChange={(e) => handleChange('coreCustomerNeed', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
              rows={3}
              placeholder="The deep underlying need your promise addresses..."
            />
          ) : d.coreCustomerNeed ? (
            <div className="border-l-4 border-blue-300 pl-4 py-1">
              <p className="text-sm text-gray-700 leading-relaxed italic">{d.coreCustomerNeed}</p>
            </div>
          ) : (
            <p className="text-sm italic text-gray-400">Define the core customer need...</p>
          )}
        </div>
      </div>

      {/* Card 4: Differentiator */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Differentiator</h2>
            <p className="text-sm text-gray-500">What makes your promise unique — Neumeier&apos;s Onlyness Test</p>
          </div>
        </div>

        <div className="space-y-4">
          <BenefitField
            icon={Target}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            label="Differentiator"
            description="What sets your promise apart from competitors?"
            value={isEditing ? draft.differentiator : d.differentiator}
            isEditing={isEditing}
            onChange={(v) => handleChange('differentiator', v)}
            placeholder="Describe what makes your promise unique..."
          />

          <div className="bg-violet-50/30 border border-violet-100 rounded-xl p-3">
            <p className="text-xs text-violet-600 italic">&ldquo;Only [your brand] can _____ because _____.&rdquo;</p>
          </div>

          {isEditing ? (
            <textarea
              value={draft.onlynessStatement}
              onChange={(e) => handleChange('onlynessStatement', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
              rows={2}
              placeholder="Only [brand] can... because..."
            />
          ) : d.onlynessStatement ? (
            <p className="text-sm text-gray-700 leading-relaxed">{d.onlynessStatement}</p>
          ) : (
            <p className="text-sm italic text-gray-400">Complete the Onlyness Statement...</p>
          )}
        </div>
      </div>

      {/* Card 5: Evidence (Proof Points + Measurable Outcomes) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Evidence</h2>
            <p className="text-sm text-gray-500">Concrete proof that your promise is real and measurable</p>
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

        {/* Measurable Outcomes */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Measurable Outcomes</p>
          <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3 mb-3">
            <p className="text-xs text-gray-500">Specific, quantifiable results that demonstrate promise delivery</p>
          </div>
          <StringListEditor
            items={isEditing ? draft.measurableOutcomes : d.measurableOutcomes}
            isEditing={isEditing}
            onAdd={() => addListItem('measurableOutcomes')}
            onUpdate={(i, v) => updateListItem('measurableOutcomes', i, v)}
            onRemove={(i) => removeListItem('measurableOutcomes', i)}
            placeholder="Add a measurable outcome..."
            emptyText="No measurable outcomes defined yet"
          />
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
