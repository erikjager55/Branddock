'use client';

import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { ImpactBadge } from './ImpactBadge';
import { RepeatableListInput } from '../create/RepeatableListInput';

interface BehaviorsSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

export function BehaviorsSection({ persona, isEditing, onUpdate }: BehaviorsSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Behaviors</h2>
        <ImpactBadge impact="medium" />
      </div>

      {isEditing ? (
        <RepeatableListInput
          items={persona.behaviors}
          onChange={(items) => onUpdate({ behaviors: items })}
          placeholder="Add a behavior..."
        />
      ) : persona.behaviors.length > 0 ? (
        <ul className="space-y-1.5">
          {persona.behaviors.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-gray-300 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-300 italic">No behaviors defined</p>
      )}
    </section>
  );
}
