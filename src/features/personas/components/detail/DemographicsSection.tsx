'use client';

import { useState } from 'react';
import { Calendar, MapPin, Building2, DollarSign, Users, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { ImpactBadge } from './ImpactBadge';

const ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  Users,
  GraduationCap,
};

const FIELDS: { key: keyof PersonaWithMeta; icon: string; label: string }[] = [
  { key: 'age', icon: 'Calendar', label: 'AGE' },
  { key: 'location', icon: 'MapPin', label: 'LOCATION' },
  { key: 'occupation', icon: 'Building2', label: 'OCCUPATION' },
  { key: 'income', icon: 'DollarSign', label: 'INCOME' },
  { key: 'familyStatus', icon: 'Users', label: 'FAMILY STATUS' },
  { key: 'education', icon: 'GraduationCap', label: 'EDUCATION' },
];

interface DemographicsSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

export function DemographicsSection({ persona, isEditing, onUpdate }: DemographicsSectionProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key: string) => {
    if (draft[key] !== undefined) {
      onUpdate({ [key]: draft[key] } as UpdatePersonaBody);
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Demographics</h2>
        <ImpactBadge impact="high" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {FIELDS.map(({ key, icon, label }) => {
          const Icon = ICON_MAP[icon];
          const value = persona[key] as string | null;

          return (
            <div key={key} className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1.5 rounded-lg bg-gray-50">
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {label}
                </p>
                {isEditing ? (
                  <input
                    defaultValue={value ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleBlur(key)}
                    className="w-full mt-0.5 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                ) : (
                  <p className="text-sm text-gray-700 mt-0.5">
                    {value || <span className="text-gray-300 italic">Not set</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
