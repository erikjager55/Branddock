'use client';

import { useState } from 'react';
import { Calendar, MapPin, Building2, DollarSign, Users, GraduationCap, RefreshCw, ImageIcon, CheckCircle } from 'lucide-react';
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

  const hasAvatar = !!persona.avatarUrl;

  return (
    <section className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Impact badge — top-right of the card, outside the header */}
      <div className="absolute top-3 right-3 z-10">
        <ImpactBadge impact="high" />
      </div>

      {/* Gradient header — emerald → cyan/teal */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Demographics</h2>
          <p className="text-xs text-white/70 mt-0.5">Key demographic information</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/20 text-white backdrop-blur-sm">
          ID Profile
        </span>
      </div>

      {/* Profile Picture — horizontal layout: photo left, text+button right */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start gap-5">
          <OptimizedImage
            src={persona.avatarUrl}
            alt={persona.name}
            width={112}
            height={112}
            className="rounded-xl object-cover w-28 h-28 flex-shrink-0"
            fallback={
              <div className="w-28 h-28 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
            }
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm font-medium text-gray-900">Profile Picture</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              AI-generated profile picture based on demographics
            </p>
            <button className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-emerald-600 transition-colors">
              <RefreshCw className="w-3 h-3" />
              {hasAvatar ? 'Regenerate Photo' : 'Generate Photo'}
            </button>
          </div>
        </div>
      </div>

      {/* Dashed separator */}
      <div className="mx-6 border-t border-dashed border-gray-200" />

      {/* Demographics grid — 2 columns */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          {FIELDS.map(({ key, icon, label }) => {
            const Icon = ICON_MAP[icon];
            const value = persona[key] as string | null;

            return (
              <div key={key} className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-50">
                  <Icon className="w-4 h-4 text-emerald-600/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-emerald-600/70 uppercase tracking-wider">
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

      {/* Dashed separator */}
      <div className="mx-6 border-t border-dashed border-gray-200" />

      {/* Footer */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            Persona &middot; Personal
          </span>
        </div>
        <span className="inline-flex items-center gap-1 border border-emerald-200 text-emerald-600 text-xs px-2.5 py-1 rounded-full font-medium">
          <CheckCircle className="w-3 h-3" />
          Verified Profile
        </span>
      </div>
    </section>
  );
}
