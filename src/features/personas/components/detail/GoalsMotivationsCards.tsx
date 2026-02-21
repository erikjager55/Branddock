'use client';

import { Target, Heart, AlertTriangle, CheckCircle } from 'lucide-react';
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
  checkColor: string;
  subCardBg: string;
  subCardBorder: string;
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
    checkColor: 'text-emerald-500',
    subCardBg: 'bg-emerald-50/50',
    subCardBorder: 'border-emerald-100',
  },
  {
    key: 'motivations',
    title: 'Motivations',
    subtitle: 'What drives their decisions',
    impact: 'high',
    placeholder: 'Add a motivation...',
    icon: Heart,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-500',
    checkColor: 'text-pink-500',
    subCardBg: 'bg-pink-50/50',
    subCardBorder: 'border-pink-100',
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
    checkColor: 'text-amber-500',
    subCardBg: 'bg-amber-50/50',
    subCardBorder: 'border-amber-100',
  },
];

export function GoalsMotivationsCards({ persona, isEditing, onUpdate }: GoalsMotivationsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {CARDS.map(({ key, title, subtitle, impact, placeholder, icon: Icon, iconBg, iconColor, checkColor, subCardBg, subCardBorder }) => (
        <div
          key={key}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          {/* Row 1: icon + impact badge */}
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <ImpactBadge impact={impact} />
          </div>

          {/* Row 2: title */}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

          {/* Row 3: subtitle */}
          <p className="text-sm text-gray-500 mt-0.5 mb-3">{subtitle}</p>

          {/* Items sub-card */}
          {isEditing ? (
            <RepeatableListInput
              items={persona[key]}
              onChange={(items) => onUpdate({ [key]: items })}
              placeholder={placeholder}
            />
          ) : persona[key].length > 0 ? (
            <div className={`rounded-xl border ${subCardBorder} ${subCardBg} p-4`}>
              <ul className="space-y-2">
                {persona[key].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className={`w-4 h-4 ${checkColor} mt-0.5 shrink-0`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-300 italic">None defined</p>
          )}

          {/* Count footer */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{persona[key].length} items</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
