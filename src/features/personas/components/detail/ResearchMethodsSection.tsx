'use client';

import type { PersonaWithMeta } from '../../types/persona.types';
import { PersonaConfidenceBadge } from '../PersonaConfidenceBadge';
import { ResearchMethodCard } from './ResearchMethodCard';
import { PERSONA_RESEARCH_METHODS } from '../../constants/persona-research-methods';

interface ResearchMethodsSectionProps {
  persona: PersonaWithMeta;
  onStartMethod: (method: string) => void;
}

export function ResearchMethodsSection({ persona, onStartMethod }: ResearchMethodsSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Research & Validation</h2>
        <PersonaConfidenceBadge percentage={persona.validationPercentage} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PERSONA_RESEARCH_METHODS.map((config) => {
          const methodData = persona.researchMethods.find(
            (m) => m.method === config.method,
          );

          return (
            <ResearchMethodCard
              key={config.method}
              config={config}
              method={methodData ?? {
                method: config.method,
                status: 'AVAILABLE' as const,
                progress: 0,
                completedAt: null,
                artifactsCount: 0,
              }}
              onStart={() => onStartMethod(config.method)}
            />
          );
        })}
      </div>
    </section>
  );
}
