'use client';

import { useState } from 'react';
import { Calendar, MapPin, Building2, DollarSign, Users, GraduationCap, RefreshCw, ImageIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OptimizedImage } from '@/components/shared';
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

  const initials = persona.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Demographics</h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20 text-white">
            ID Profile
          </span>
        </div>
        <ImpactBadge impact="high" />
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex gap-8">
          {/* Left: demographic fields */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Right: Profile Picture */}
          <div className="w-[35%] flex-shrink-0 flex flex-col items-center gap-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              Profile Picture
            </p>
            <OptimizedImage
              src={persona.avatarUrl}
              alt={persona.name}
              width={128}
              height={128}
              className="rounded-xl object-cover"
              fallback={
                <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              }
            />
            <p className="text-xs text-gray-500 text-center leading-snug">
              AI-generated profile picture based on demographics
            </p>
            <button className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-emerald-600 transition-colors">
              <RefreshCw className="w-3 h-3" />
              Regenerate Photo
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Persona &middot; Personal
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Verified Profile
        </span>
      </div>
    </section>
  );
}
