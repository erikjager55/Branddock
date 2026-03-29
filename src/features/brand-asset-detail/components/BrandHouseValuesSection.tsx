'use client';

import { useState, useEffect } from 'react';
import { Anchor, Compass, Flame, Info, Scale } from 'lucide-react';
import type { BrandHouseValuesFrameworkData, BrandHouseValue } from '../types/framework.types';

// ─── Constants ──────────────────────────────────────────────

const EMPTY_VALUE: BrandHouseValue = { name: '', description: '' };

const EMPTY_DATA: BrandHouseValuesFrameworkData = {
  anchorValue1: { ...EMPTY_VALUE },
  anchorValue2: { ...EMPTY_VALUE },
  aspirationValue1: { ...EMPTY_VALUE },
  aspirationValue2: { ...EMPTY_VALUE },
  ownValue: { ...EMPTY_VALUE },
  valueTension: '',
};

// ─── Props ──────────────────────────────────────────────────

interface BrandHouseValuesSectionProps {
  data: BrandHouseValuesFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: BrandHouseValuesFrameworkData) => void;
}

// ─── Helpers ────────────────────────────────────────────────

function normalizeValue(raw: BrandHouseValue | null | undefined): BrandHouseValue {
  return {
    name: raw?.name ?? '',
    description: raw?.description ?? '',
  };
}

function normalize(raw: BrandHouseValuesFrameworkData | null): BrandHouseValuesFrameworkData {
  if (!raw) return EMPTY_DATA;
  return {
    anchorValue1: normalizeValue(raw.anchorValue1),
    anchorValue2: normalizeValue(raw.anchorValue2),
    aspirationValue1: normalizeValue(raw.aspirationValue1),
    aspirationValue2: normalizeValue(raw.aspirationValue2),
    ownValue: normalizeValue(raw.ownValue),
    valueTension: raw.valueTension ?? '',
  };
}

// ─── Sub-component ──────────────────────────────────────────

interface ValueFieldProps {
  label: string;
  value: BrandHouseValue;
  isEditing: boolean;
  onChange: (value: BrandHouseValue) => void;
  namePlaceholder: string;
  descriptionPlaceholder: string;
}

function ValueField({ label, value, isEditing, onChange, namePlaceholder, descriptionPlaceholder }: ValueFieldProps) {
  if (isEditing) {
    return (
      <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          placeholder={namePlaceholder}
        />
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
          rows={2}
          placeholder={descriptionPlaceholder}
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      {value.name ? (
        <>
          <p className="text-sm font-semibold text-gray-900">{value.name}</p>
          {value.description && (
            <p className="text-sm text-gray-600 leading-relaxed mt-1">{value.description}</p>
          )}
        </>
      ) : (
        <p className="text-sm italic text-gray-400">{namePlaceholder}</p>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

/** Core Values canvas with 3 cards based on the BrandHouse/Brandstar value model (Roots, Wings, Fire). */
export function BrandHouseValuesSection({ data, isEditing, onUpdate }: BrandHouseValuesSectionProps) {
  const [draft, setDraft] = useState<BrandHouseValuesFrameworkData>(() => normalize(data));

  useEffect(() => {
    setDraft(normalize(data));
  }, [data]);

  const handleChange = (field: keyof BrandHouseValuesFrameworkData, value: unknown) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  const d = normalize(data);

  return (
    <div className="space-y-4">
      {/* Methodology intro */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">BrandHouse Value Model</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Every brand needs at least five core values, organized in three categories.
          Start by inventorying values with your team (4-6 people), then cluster and select
          through consensus. For each value, ask: is it a prerequisite (table stakes) or truly
          distinguishing? Only distinguishing values belong here.
        </p>
      </div>

      {/* Card 1: Roots (Anchor Values) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Anchor className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Roots
              <span className="text-sm font-normal text-gray-400 ml-2">Anchor Values</span>
            </h2>
            <p className="text-sm text-gray-500">The foundation your organization is built on &mdash; values already proven through daily actions</p>
          </div>
        </div>

        <div className="bg-primary-50/30 border border-primary-100 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-primary">
            Roots are the foundational principles of your organization. They are already embedded in how you operate today.
            Think of what your team would say when asked: &ldquo;What do we stand for, no matter what?&rdquo;
          </p>
        </div>

        <div className="space-y-3">
          <ValueField
            label="Root Value 1"
            value={isEditing ? draft.anchorValue1 : d.anchorValue1}
            isEditing={isEditing}
            onChange={(v) => handleChange('anchorValue1', v)}
            namePlaceholder="e.g. Integrity, Reliability, Quality..."
            descriptionPlaceholder="How is this value visible in everyday actions? Give concrete examples..."
          />
          <ValueField
            label="Root Value 2"
            value={isEditing ? draft.anchorValue2 : d.anchorValue2}
            isEditing={isEditing}
            onChange={(v) => handleChange('anchorValue2', v)}
            namePlaceholder="e.g. Transparency, Craftsmanship, Care..."
            descriptionPlaceholder="How is this value visible in everyday actions? Give concrete examples..."
          />
        </div>
      </div>

      {/* Card 2: Wings (Aspiration Values) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Compass className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Wings
              <span className="text-sm font-normal text-gray-400 ml-2">Aspiration Values</span>
            </h2>
            <p className="text-sm text-gray-500">Values that give direction to the movement your brand wants to make</p>
          </div>
        </div>

        <div className="bg-violet-50/30 border border-violet-100 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-violet-600">
            Wings represent your direction and ambition. They require active effort and conscious investment.
            These are the values that pull you forward &mdash; where you want to grow, not just where you are today.
          </p>
        </div>

        <div className="space-y-3">
          <ValueField
            label="Wing Value 1"
            value={isEditing ? draft.aspirationValue1 : d.aspirationValue1}
            isEditing={isEditing}
            onChange={(v) => handleChange('aspirationValue1', v)}
            namePlaceholder="e.g. Innovation, Boldness, Sustainability..."
            descriptionPlaceholder="What concrete steps are you taking to grow into this value?..."
          />
          <ValueField
            label="Wing Value 2"
            value={isEditing ? draft.aspirationValue2 : d.aspirationValue2}
            isEditing={isEditing}
            onChange={(v) => handleChange('aspirationValue2', v)}
            namePlaceholder="e.g. Inclusivity, Thought Leadership..."
            descriptionPlaceholder="What concrete steps are you taking to grow into this value?..."
          />
        </div>
      </div>

      {/* Card 3: Fire (Own Value) + Value Tension */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Flame className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Fire
              <span className="text-sm font-normal text-gray-400 ml-2">Own Value</span>
            </h2>
            <p className="text-sm text-gray-500">The one value that most distinctively describes how your organization does things</p>
          </div>
        </div>

        <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-600">
            Fire is your most distinguishing characteristic &mdash; the value that makes your brand unmistakably yours.
            If a competitor adopted all your other values, this is the one they could never replicate authentically.
          </p>
        </div>

        {/* Own Value — highlighted */}
        <div className="mb-5">
          {isEditing ? (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
              <label className="text-xs font-medium text-amber-700 uppercase tracking-wider">Own Value</label>
              <input
                type="text"
                value={draft.ownValue.name}
                onChange={(e) => handleChange('ownValue', { ...draft.ownValue, name: e.target.value })}
                className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                placeholder="e.g. Playfulness, Precision, Empowerment..."
              />
              <textarea
                value={draft.ownValue.description}
                onChange={(e) => handleChange('ownValue', { ...draft.ownValue, description: e.target.value })}
                className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                rows={2}
                placeholder="Why is this the one value no competitor could authentically copy?..."
              />
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Own Value</p>
              {d.ownValue.name ? (
                <>
                  <p className="text-sm font-semibold text-gray-900">{d.ownValue.name}</p>
                  {d.ownValue.description && (
                    <p className="text-sm text-gray-600 leading-relaxed mt-1">{d.ownValue.description}</p>
                  )}
                </>
              ) : (
                <p className="text-sm italic text-gray-400">Define your own value...</p>
              )}
            </div>
          )}
        </div>

        {/* Value Tension */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-gray-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Value Tension</p>
          </div>
          <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3 mb-3">
            <p className="text-xs text-gray-500">
              Great value sets have productive tension. How do your roots, wings, and fire balance each other?
              Where do they create a healthy pull in different directions?
            </p>
          </div>
          {isEditing ? (
            <textarea
              value={draft.valueTension}
              onChange={(e) => handleChange('valueTension', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
              rows={3}
              placeholder="e.g. Our root of Reliability keeps our wing of Innovation grounded — we move fast but never ship anything we're not proud of..."
            />
          ) : d.valueTension ? (
            <p className="text-sm text-gray-700 leading-relaxed">{d.valueTension}</p>
          ) : (
            <p className="text-sm italic text-gray-400">Describe the tension between your values...</p>
          )}
        </div>
      </div>
    </div>
  );
}
