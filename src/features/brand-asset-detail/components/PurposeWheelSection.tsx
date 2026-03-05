'use client';

import { useState, useEffect } from 'react';
import {
  Target, Cog, FlaskConical, CheckCircle,
  Sparkles, Compass, Heart, TreePine, Smile,
} from 'lucide-react';
import type { PurposeWheelFrameworkData } from '../types/framework.types';

// ─── IDEO Impact Types ──────────────────────────────────────

interface ImpactTypeOption {
  value: string;
  label: string;
  description: string;
  icon: typeof Target;
  bgColor: string;
  borderColor: string;
  textColor: string;
  ringClass: string;
}

const IMPACT_TYPES: ImpactTypeOption[] = [
  {
    value: 'Enable Potential',
    label: 'Enable Potential',
    description: 'Helping people and communities unlock capabilities they didn\'t know they had',
    icon: Sparkles,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    ringClass: 'ring-amber-300',
  },
  {
    value: 'Reduce Friction',
    label: 'Reduce Friction',
    description: 'Removing barriers and making things easier, simpler, more accessible',
    icon: Compass,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    ringClass: 'ring-blue-300',
  },
  {
    value: 'Foster Prosperity',
    label: 'Foster Prosperity',
    description: 'Creating economic opportunity and sustainable growth for all stakeholders',
    icon: TreePine,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    ringClass: 'ring-emerald-300',
  },
  {
    value: 'Encourage Exploration',
    label: 'Encourage Exploration',
    description: 'Inspiring curiosity, discovery and new ways of thinking about the world',
    icon: Sparkles,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    ringClass: 'ring-purple-300',
  },
  {
    value: 'Kindle Happiness',
    label: 'Kindle Happiness',
    description: 'Creating joy, connection and meaningful moments in people\'s lives',
    icon: Smile,
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    ringClass: 'ring-rose-300',
  },
];

// ─── IDEO Outer Wheel Mechanisms (15 categories) ────────────

const MECHANISM_CATEGORIES = [
  'Celebrating Creativity',
  'Inspiring Curiosity',
  'Building Community',
  'Championing Wellbeing',
  'Cultivating Trust',
  'Democratizing Access',
  'Driving Efficiency',
  'Elevating Experiences',
  'Empowering Individuals',
  'Fueling Adventure',
  'Igniting Joy',
  'Nurturing Growth',
  'Protecting Resources',
  'Simplifying Complexity',
  'Sparking Connection',
];

// ─── Pressure Test Questions ────────────────────────────────

const PRESSURE_TEST_QUESTIONS = [
  'What would the world lose if your organization ceased to exist?',
  'What would this purpose unlock for your employees?',
  'Which decisions would be different if everyone truly lived this purpose?',
];

// ─── Empty state helper ─────────────────────────────────────

const EMPTY_DATA: PurposeWheelFrameworkData = {
  statement: '', impactType: '', impactDescription: '', mechanismCategory: '', mechanism: '', pressureTest: '',
};

// ─── Props ──────────────────────────────────────────────────

interface PurposeWheelSectionProps {
  data: PurposeWheelFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: PurposeWheelFrameworkData) => void;
}

// ─── Component ──────────────────────────────────────────────

export function PurposeWheelSection({ data, isEditing, onUpdate }: PurposeWheelSectionProps) {
  const d = data ?? EMPTY_DATA;

  const [draft, setDraft] = useState<PurposeWheelFrameworkData>(d);

  // Sync draft when data prop changes (e.g. save, version restore, AI apply)
  useEffect(() => {
    setDraft(data ?? EMPTY_DATA);
  }, [data]);

  const handleChange = (field: keyof PurposeWheelFrameworkData, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  // Parse pressureTest into list items (if it contains line breaks)
  const pressureItems = d.pressureTest
    ? d.pressureTest.split(/\n/).map(s => s.trim()).filter(Boolean)
    : [];
  const showAsList = pressureItems.length > 1;

  return (
    <div className="space-y-4">
      {/* Card 1: Purpose Statement (hero) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Purpose Statement</h2>
            <p className="text-sm text-gray-500">The core reason your organization exists</p>
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={draft.statement}
            onChange={(e) => handleChange('statement', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none italic"
            rows={3}
            placeholder="Define your purpose statement..."
          />
        ) : d.statement ? (
          <div className="border-l-4 border-teal-400 pl-4 py-2">
            <p className="text-lg italic text-gray-700 leading-relaxed">
              &ldquo;{d.statement}&rdquo;
            </p>
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Define your purpose statement...</p>
        )}
      </div>

      {/* Card 2: Impact Type — Visual Cards */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Heart className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Impact Type</h2>
            <p className="text-sm text-gray-500">How your organization makes a difference in the world (IDEO Inner Wheel)</p>
          </div>
        </div>

        {/* 5 Impact Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {IMPACT_TYPES.map((type) => {
            const isSelected = (isEditing ? draft.impactType : d.impactType) === type.value;
            const Icon = type.icon;

            return (
              <button
                key={type.value}
                type="button"
                disabled={!isEditing}
                onClick={() => {
                  if (!isEditing) return;
                  handleChange('impactType', draft.impactType === type.value ? '' : type.value);
                }}
                className={`
                  relative text-left p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                    ? `${type.bgColor} ${type.borderColor} ring-1 ring-offset-1 ${type.ringClass}`
                    : isEditing
                      ? 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                      : 'bg-gray-50 border-gray-100 opacity-60'
                  }
                  ${isEditing ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className={`h-4 w-4 ${type.textColor}`} />
                  </div>
                )}
                <div className={`h-8 w-8 rounded-lg ${isSelected ? type.bgColor : 'bg-gray-100'} flex items-center justify-center mb-2`}>
                  <Icon className={`h-4 w-4 ${isSelected ? type.textColor : 'text-gray-400'}`} />
                </div>
                <p className={`text-sm font-semibold ${isSelected ? type.textColor : 'text-gray-700'}`}>
                  {type.label}
                </p>
                <p className={`text-xs mt-1 leading-relaxed ${isSelected ? type.textColor + ' opacity-80' : 'text-gray-500'}`}>
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Impact Description */}
        <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            How does this impact look for your organization?
          </p>
          {isEditing ? (
            <textarea
              value={draft.impactDescription}
              onChange={(e) => handleChange('impactDescription', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
              rows={3}
              placeholder="Describe how this impact looks for your organization in practice..."
            />
          ) : d.impactDescription ? (
            <p className="text-sm text-gray-700 leading-relaxed">{d.impactDescription}</p>
          ) : (
            <p className="text-sm italic text-gray-400">Describe how this impact looks for your organization in practice...</p>
          )}
        </div>
      </div>

      {/* Card 3: Mechanism — selectable category + description */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Cog className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mechanism</h2>
            <p className="text-sm text-gray-500">How you deliver on your purpose (IDEO Outer Wheel)</p>
          </div>
        </div>

        {/* Selectable category — 15 outer wheel categories */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Select your mechanism category
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MECHANISM_CATEGORIES.map((cat) => {
              const currentCat = isEditing ? draft.mechanismCategory : d.mechanismCategory;
              const isSelected = currentCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={!isEditing}
                  onClick={() => {
                    if (!isEditing) return;
                    // Toggle: clicking selected deselects
                    handleChange('mechanismCategory', draft.mechanismCategory === cat ? '' : cat);
                  }}
                  className={`
                    inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150
                    ${isSelected
                      ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
                      : isEditing
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-100 hover:border-blue-300'
                        : 'bg-gray-50 text-gray-500 border border-gray-100 cursor-default'
                    }
                  `}
                >
                  {cat}
                  {isSelected && <CheckCircle className="h-3 w-3 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mechanism description textarea */}
        <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Describe how this mechanism works for your organization
          </p>
          {isEditing ? (
            <textarea
              value={draft.mechanism}
              onChange={(e) => handleChange('mechanism', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 bg-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
              rows={3}
              placeholder="Describe through what unique means you achieve your impact..."
            />
          ) : d.mechanism ? (
            <p className="text-sm text-gray-700 leading-relaxed">{d.mechanism}</p>
          ) : (
            <p className="text-sm italic text-gray-400">Describe through what unique means you achieve your impact...</p>
          )}
        </div>
      </div>

      {/* Card 4: Pressure Test — with helper questions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pressure Test</h2>
            <p className="text-sm text-gray-500">Validating your purpose against reality</p>
          </div>
        </div>

        {/* Helper Questions */}
        <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-2">
            Consider these questions
          </p>
          <ul className="space-y-1.5">
            {PRESSURE_TEST_QUESTIONS.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs font-bold text-purple-400 mt-0.5">{i + 1}.</span>
                <span className="text-xs text-purple-700 leading-relaxed">{q}</span>
              </li>
            ))}
          </ul>
        </div>

        {isEditing ? (
          <textarea
            value={draft.pressureTest}
            onChange={(e) => handleChange('pressureTest', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
            rows={4}
            placeholder="Answer the pressure test questions above..."
          />
        ) : d.pressureTest ? (
          showAsList ? (
            <div className="space-y-2">
              {pressureItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">{d.pressureTest}</p>
          )
        ) : (
          <p className="text-sm italic text-gray-400">Answer the pressure test questions above...</p>
        )}
      </div>
    </div>
  );
}
