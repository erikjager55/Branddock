'use client';

import { useState } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { Button, EmptyState } from '@/components/shared';
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
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Strategic Implications</h2>
        </div>
        <ImpactBadge impact="high" />
      </div>

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
        <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center">
          <EmptyState
            icon={Sparkles}
            title="No strategic implications yet"
            description="Generate insights based on this persona's profile using AI."
            action={{
              label: isGenerating ? 'Generating...' : 'Generate with AI',
              onClick: onGenerate,
            }}
          />
        </div>
      )}
    </section>
  );
}
