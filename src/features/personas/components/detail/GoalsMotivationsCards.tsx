'use client';

import { Target, Heart, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
  subtitle: string;
  impact: 'high' | 'medium' | 'low';
  placeholder: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  dotColor: string;
}[] = [
  {
    key: 'goals',
    title: 'Goals',
    subtitle: 'What they want to achieve',
    impact: 'high',
    placeholder: 'Add a goal...',
    icon: Target,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    dotColor: 'text-emerald-400',
  },
  {
    key: 'motivations',
    title: 'Motivations',
    subtitle: 'What drives their decisions',
    impact: 'high',
    placeholder: 'Add a motivation...',
    icon: Heart,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    dotColor: 'text-red-400',
  },
  {
    key: 'frustrations',
    title: 'Frustrations',
    subtitle: 'Pain points and challenges',
    impact: 'medium',
    placeholder: 'Add a frustration...',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
    dotColor: 'text-amber-400',
  },
];

export function GoalsMotivationsCards({ persona, isEditing, onUpdate }: GoalsMotivationsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {CARDS.map(({ key, title, subtitle, impact, placeholder, icon: Icon, iconBg, iconColor, dotColor }) => (
        <div
          key={key}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <ImpactBadge impact={impact} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            </div>
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
                  <span className={`${dotColor} mt-0.5`}>&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-300 italic">None defined</p>
          )}

          {/* Count footer */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{persona[key].length} items</p>
          </div>
        </div>
      ))}
    </div>
  );
}
