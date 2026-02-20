'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, EmptyState } from '@/components/shared';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';

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
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Strategic Implications</h2>
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
