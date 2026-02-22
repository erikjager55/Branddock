'use client';

import { useState } from 'react';
import { Calendar, MapPin, Building2, DollarSign, Users, GraduationCap, CheckCircle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';

const FIELDS: { key: keyof PersonaWithMeta; icon: LucideIcon; label: string }[] = [
  { key: 'age', icon: Calendar, label: 'AGE' },
  { key: 'location', icon: MapPin, label: 'LOCATION' },
  { key: 'occupation', icon: Building2, label: 'OCCUPATION' },
  { key: 'education', icon: GraduationCap, label: 'EDUCATION' },
  { key: 'income', icon: DollarSign, label: 'INCOME' },
  { key: 'familyStatus', icon: Users, label: 'FAMILY STATUS' },
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
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Compact header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Demographics</h2>
            <p className="text-xs text-gray-500">Key demographic information</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-200 text-blue-600">
          ID Profile
        </span>
      </div>

      {/* 3×2 grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {FIELDS.map(({ key, icon: Icon, label }) => {
            const value = persona[key] as string | null;

            return (
              <div key={key}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
                </div>
                {isEditing ? (
                  <input
                    defaultValue={value ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleBlur(key)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">
                    {value || <span className="text-gray-300">—</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            Persona &middot; Personal
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 border border-emerald-200 text-emerald-600 text-xs px-2.5 py-0.5 rounded-full font-medium">
          <CheckCircle className="w-3 h-3" />
          Verified Profile
        </span>
      </div>
    </section>
  );
}
