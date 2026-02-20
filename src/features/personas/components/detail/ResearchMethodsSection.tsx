'use client';

import type { PersonaWithMeta } from '../../types/persona.types';
import { ResearchMethodCard } from './ResearchMethodCard';
import { PERSONA_RESEARCH_METHODS } from '../../constants/persona-research-methods';

interface ResearchMethodsSectionProps {
  persona: PersonaWithMeta;
  onStartMethod: (method: string) => void;
}

export function ResearchMethodsSection({ persona, onStartMethod }: ResearchMethodsSectionProps) {
  const completedMethods = persona.researchMethods.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Research & Validation</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Strengthen this persona through evidence-based research
          </p>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {completedMethods}/4 methods completed
        </span>
      </div>

      <div className="space-y-3">
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
