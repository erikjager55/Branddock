'use client';

import { Zap, CheckCircle } from 'lucide-react';
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
    <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Behaviors</h2>
            <p className="text-sm text-gray-500">Observable actions and patterns</p>
          </div>
        </div>
        <ImpactBadge impact="medium" />
      </div>

      <div className="mt-4 flex-1">
        {isEditing ? (
          <RepeatableListInput
            items={persona.behaviors}
            onChange={(items) => onUpdate({ behaviors: items })}
            placeholder="Add a behavior..."
          />
        ) : persona.behaviors.length > 0 ? (
          <div className="bg-purple-50/30 border border-purple-100 rounded-xl p-4">
            <ul className="space-y-2">
              {persona.behaviors.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-300 italic">No behaviors defined</p>
        )}
      </div>

      {/* Count footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
        <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
        <span>{persona.behaviors.length} items</span>
      </div>
    </section>
  );
}
