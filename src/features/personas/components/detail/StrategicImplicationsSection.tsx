'use client';

import { useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { ImpactBadge } from './ImpactBadge';

interface StrategicImplicationsSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function StrategicImplicationsSection({
  persona,
  isEditing,
  onUpdate,
  onGenerate,
  isGenerating,
}: StrategicImplicationsSectionProps) {
  const [draft, setDraft] = useState(persona.strategicImplications ?? '');

  const handleBlur = () => {
    if (draft !== persona.strategicImplications) {
      onUpdate({ strategicImplications: draft });
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Strategic Implications</h2>
            <p className="text-sm text-gray-500">How this persona impacts decisions</p>
          </div>
        </div>
        <ImpactBadge impact="high" />
      </div>

      <div className="mt-4 flex-1">
        {persona.strategicImplications ? (
          isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleBlur}
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {persona.strategicImplications}
            </p>
          )
        ) : (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-6 text-center">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No strategic implications defined yet</p>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="mt-3 inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
