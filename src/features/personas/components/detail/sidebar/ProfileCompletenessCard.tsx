'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import type { PersonaWithMeta } from '../../../types/persona.types';
import { CircularProgress } from '../CircularProgress';

interface ProfileCompletenessCardProps {
  persona: PersonaWithMeta;
}

interface FieldCheck {
  label: string;
  filled: boolean;
}

function len(arr: string[] | null | undefined): number {
  return arr?.length ?? 0;
}

function getProfileFields(persona: PersonaWithMeta): FieldCheck[] {
  return [
    { label: 'Demographics', filled: !!(persona.age && persona.location && persona.occupation) },
    { label: 'Quote & Bio', filled: !!(persona.quote || persona.bio) },
    { label: 'Psychographics', filled: len(persona.coreValues) > 0 && len(persona.interests) > 0 },
    { label: 'Channels & Tools', filled: len(persona.preferredChannels) > 0 || len(persona.techStack) > 0 },
    { label: 'Goals & Motivations', filled: len(persona.goals) > 0 && len(persona.motivations) > 0 },
    { label: 'Frustrations', filled: len(persona.frustrations) > 0 },
    { label: 'Behaviors', filled: len(persona.behaviors) > 0 },
    { label: 'Buying Triggers', filled: len(persona.buyingTriggers) > 0 || len(persona.decisionCriteria) > 0 },
  ];
}

export function ProfileCompletenessCard({ persona }: ProfileCompletenessCardProps) {
  const fields = getProfileFields(persona);
  const filledCount = fields.filter((f) => f.filled).length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <CircularProgress percentage={percentage} size={48} strokeWidth={4} />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Profile Completeness</h3>
          <p className="text-xs text-gray-500">{filledCount}/{fields.length} sections filled</p>
        </div>
      </div>

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center gap-2 text-xs">
            {field.filled ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
            )}
            <span className={field.filled ? 'text-gray-700' : 'text-gray-400'}>
              {field.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
