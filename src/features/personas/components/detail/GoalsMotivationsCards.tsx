'use client';

import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { ImpactBadge } from './ImpactBadge';
import { RepeatableListInput } from '../create/RepeatableListInput';

interface GoalsMotivationsCardsProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

const CARDS: {
  key: 'goals' | 'motivations' | 'frustrations';
  title: string;
  impact: 'high' | 'medium' | 'low';
  placeholder: string;
}[] = [
  { key: 'goals', title: 'Goals', impact: 'high', placeholder: 'Add a goal...' },
  { key: 'motivations', title: 'Motivations', impact: 'high', placeholder: 'Add a motivation...' },
  { key: 'frustrations', title: 'Frustrations', impact: 'medium', placeholder: 'Add a frustration...' },
];

export function GoalsMotivationsCards({ persona, isEditing, onUpdate }: GoalsMotivationsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {CARDS.map(({ key, title, impact, placeholder }) => (
        <div
          key={key}
          className="border border-gray-200 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <ImpactBadge impact={impact} />
          </div>

          {isEditing ? (
            <RepeatableListInput
              items={persona[key]}
              onChange={(items) => onUpdate({ [key]: items })}
              placeholder={placeholder}
            />
          ) : persona[key].length > 0 ? (
            <ul className="space-y-1.5">
              {persona[key].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-300 italic">None defined</p>
          )}
        </div>
      ))}
    </div>
  );
}
