'use client';

import { Zap } from 'lucide-react';
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
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Behaviors</h2>
        </div>
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
              <span className="text-emerald-400 mt-0.5">&bull;</span>
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
