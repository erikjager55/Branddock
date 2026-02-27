'use client';

import { useState } from 'react';
import { Target, Lightbulb, Cog, FlaskConical, ClipboardList, CheckCircle } from 'lucide-react';
import type { PurposeWheelFrameworkData } from '../types/framework.types';

// ─── Card config ────────────────────────────────────────────

const IMPACT_TYPE_OPTIONS = [
  'Enable Potential',
  'Reduce Friction',
  'Foster Prosperity',
  'Encourage Exploration',
  'Kindle Happiness',
] as const;

// ─── Props ──────────────────────────────────────────────────

interface PurposeWheelSectionProps {
  data: PurposeWheelFrameworkData | null;
  isEditing: boolean;
  onUpdate: (data: PurposeWheelFrameworkData) => void;
}

// ─── Component ──────────────────────────────────────────────

export function PurposeWheelSection({ data, isEditing, onUpdate }: PurposeWheelSectionProps) {
  const d = data ?? { statement: '', impactType: '', impactDescription: '', mechanism: '', pressureTest: '' };

  const [draft, setDraft] = useState<PurposeWheelFrameworkData>(d);

  const handleChange = (field: keyof PurposeWheelFrameworkData, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    onUpdate(next);
  };

  // Parse pressureTest into list items (if it contains line breaks / bullet points)
  const pressureItems = d.pressureTest
    ? d.pressureTest.split(/\n|(?:\.\s)/).map(s => s.trim()).filter(Boolean)
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

      {/* Card 2: Impact */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Impact</h2>
            <p className="text-sm text-gray-500">How your organization makes a difference</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Impact Type */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Impact Type
            </div>
            {isEditing ? (
              <select
                value={draft.impactType}
                onChange={(e) => handleChange('impactType', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
              >
                <option value="">Select an impact type...</option>
                {IMPACT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : d.impactType ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-sm font-medium text-amber-700">
                {d.impactType}
              </span>
            ) : (
              <p className="text-sm italic text-gray-400">Select an impact type...</p>
            )}
          </div>

          {/* Impact Description */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Impact Description
            </div>
            {isEditing ? (
              <textarea
                value={draft.impactDescription}
                onChange={(e) => handleChange('impactDescription', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
                rows={3}
                placeholder="Describe how this impact looks..."
              />
            ) : d.impactDescription ? (
              <p className="text-sm text-gray-700 leading-relaxed">{d.impactDescription}</p>
            ) : (
              <p className="text-sm italic text-gray-400">Describe how this impact looks...</p>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Mechanism */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Cog className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mechanism</h2>
            <p className="text-sm text-gray-500">How you deliver on your purpose</p>
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={draft.mechanism}
            onChange={(e) => handleChange('mechanism', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
            rows={3}
            placeholder="Describe through what means you achieve your impact..."
          />
        ) : d.mechanism ? (
          <p className="text-sm text-gray-700 leading-relaxed">{d.mechanism}</p>
        ) : (
          <p className="text-sm italic text-gray-400">Describe through what means you achieve your impact...</p>
        )}
      </div>

      {/* Card 4: Pressure Test */}
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

        {isEditing ? (
          <textarea
            value={draft.pressureTest}
            onChange={(e) => handleChange('pressureTest', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none"
            rows={4}
            placeholder="What would this purpose unlock for employees?"
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
          <p className="text-sm italic text-gray-400">What would this purpose unlock for employees?</p>
        )}
      </div>
    </div>
  );
}
