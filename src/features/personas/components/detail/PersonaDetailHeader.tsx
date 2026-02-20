'use client';

import { OptimizedImage } from '@/components/shared';
import type { PersonaWithMeta } from '../../types/persona.types';
import { PersonaConfidenceBadge } from '../PersonaConfidenceBadge';

interface PersonaDetailHeaderProps {
  persona: PersonaWithMeta;
}

export function PersonaDetailHeader({ persona }: PersonaDetailHeaderProps) {
  const completedMethods = persona.researchMethods.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;

  const initials = persona.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div data-testid="persona-detail-header" className="flex items-center gap-5">
      {/* Avatar */}
      <OptimizedImage
        src={persona.avatarUrl}
        alt={persona.name}
        avatar="xl"
        className="ring-2 ring-white shadow"
        fallback={
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-bold ring-2 ring-white shadow">
            {initials}
          </div>
        }
      />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-gray-900">{persona.name}</h1>
        {persona.tagline && (
          <p className="text-sm text-gray-500 mt-0.5">{persona.tagline}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <PersonaConfidenceBadge percentage={persona.validationPercentage} />
          <span className="text-sm text-gray-500">
            {completedMethods}/4 methods completed
          </span>
        </div>
      </div>
    </div>
  );
}
