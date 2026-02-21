'use client';

import { useState } from 'react';
import { Calendar, MapPin, Building2, DollarSign, Users, GraduationCap, RefreshCw, Camera, CheckCircle, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OptimizedImage } from '@/components/shared';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';

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
  { key: 'education', icon: 'GraduationCap', label: 'EDUCATION' },
  { key: 'income', icon: 'DollarSign', label: 'INCOME' },
  { key: 'familyStatus', icon: 'Users', label: 'FAMILY STATUS' },
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

  // Group fields into rows of 2 for separators
  const rows: (typeof FIELDS[number])[][] = [];
  for (let i = 0; i < FIELDS.length; i += 2) {
    rows.push(FIELDS.slice(i, i + 2));
  }

  return (
    <section className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Gradient header — blue → cyan (Figma) */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(to right in srgb, #3B82F6, #22D3EE)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Demographics</h2>
            <p className="text-xs text-white/70 mt-0.5">Key demographic information</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm">
          ID Profile
        </span>
      </div>

      {/* Profile Picture — horizontal layout: photo left, text+button right */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <OptimizedImage
            src={persona.avatarUrl}
            alt={persona.name}
            width={128}
            height={128}
            className="rounded-lg object-cover w-32 h-32 flex-shrink-0"
            fallback={
              <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                <Camera className="w-8 h-8 text-gray-300" />
              </div>
            }
          />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm font-medium text-foreground">Profile Picture</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              AI-generated profile picture based on demographics
            </p>
            <button className="mt-3 inline-flex items-center gap-2 bg-emerald-500 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-emerald-600 transition-colors">
              <Camera className="w-4 h-4" />
              {hasAvatar ? 'Regenerate Photo' : 'Generate Photo'}
            </button>
          </div>
        </div>
      </div>

      {/* Dashed separator */}
      <div className="mx-6 border-t border-dashed border-gray-200" />

      {/* Demographics grid — 2 columns with row separators */}
      <div className="px-6">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`grid grid-cols-2 gap-x-8 ${
              rowIdx < rows.length - 1 ? 'border-b border-dashed border-gray-200' : ''
            }`}
          >
            {row.map(({ key, icon, label }) => {
              const Icon = ICON_MAP[icon];
              const value = persona[key] as string | null;

              return (
                <div key={key} className="flex items-start gap-2.5 py-4">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-50">
                    <Icon className="w-5 h-5 text-emerald-600/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider">
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
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {value || <span className="text-gray-300 italic">Not set</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
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
        <span className="inline-flex items-center gap-1.5 border border-emerald-200 text-emerald-600 text-sm px-3 py-1 rounded-full font-medium">
          <CheckCircle className="w-3 h-3" />
          Verified Profile
        </span>
      </div>
    </section>
  );
}
