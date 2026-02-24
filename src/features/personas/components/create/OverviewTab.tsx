/** @deprecated No longer used — create flow now uses instant-create + detail page edit mode */
"use client";

import {
  Users,
  Calendar,
  User,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
} from "lucide-react";
import { PersonaImageGenerator } from "./PersonaImageGenerator";
import type { CreatePersonaBody } from "../../types/persona.types";

interface OverviewTabProps {
  form: CreatePersonaBody;
  avatarUrl: string;
  onUpdate: <K extends keyof CreatePersonaBody>(
    key: K,
    value: CreatePersonaBody[K],
  ) => void;
  onAvatarChange: (url: string) => void;
}

const DEMOGRAPHIC_FIELDS: {
  key: keyof CreatePersonaBody;
  label: string;
  icon: typeof Calendar;
  placeholder: string;
}[] = [
  { key: "age", label: "AGE", icon: Calendar, placeholder: "e.g., 32" },
  { key: "gender", label: "GENDER", icon: User, placeholder: "e.g., Female" },
  {
    key: "location",
    label: "LOCATION",
    icon: MapPin,
    placeholder: "e.g., Amsterdam, Netherlands",
  },
  {
    key: "occupation",
    label: "OCCUPATION",
    icon: Briefcase,
    placeholder: "e.g., Product Manager",
  },
  {
    key: "education",
    label: "EDUCATION",
    icon: GraduationCap,
    placeholder: "e.g., Bachelor's Degree",
  },
  {
    key: "income",
    label: "INCOME",
    icon: DollarSign,
    placeholder: "e.g., \u20AC60,000 - \u20AC80,000",
  },
];

export function OverviewTab({
  form,
  avatarUrl,
  onUpdate,
  onAvatarChange,
}: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Demographics card - ~60% */}
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-gray-900">Demographics</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {DEMOGRAPHIC_FIELDS.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {field.label}
                  </label>
                </div>
                <input
                  value={(form[field.key] as string) ?? ""}
                  onChange={(e) =>
                    onUpdate(field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Persona Image card - ~40% */}
      <div className="lg:col-span-2">
        <PersonaImageGenerator
          name={form.name}
          avatarUrl={avatarUrl}
          demographics={{
            age: form.age ?? undefined,
            gender: form.gender ?? undefined,
            occupation: form.occupation ?? undefined,
          }}
          onAvatarChange={onAvatarChange}
        />
      </div>
    </div>
  );
}
