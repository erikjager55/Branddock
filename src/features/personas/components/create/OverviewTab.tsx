"use client";

import { Input } from "@/components/shared";
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

export function OverviewTab({
  form,
  avatarUrl,
  onUpdate,
  onAvatarChange,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Name + Tagline */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => onUpdate("name", e.target.value)}
          placeholder="e.g. Sarah Chen"
        />
        <Input
          label="Tagline"
          value={form.tagline ?? ""}
          onChange={(e) => onUpdate("tagline", e.target.value)}
          placeholder="e.g. The Ambitious Startup Founder"
        />
      </div>

      {/* Demographics */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          Demographics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Age"
            value={form.age ?? ""}
            onChange={(e) => onUpdate("age", e.target.value)}
            placeholder="e.g. 28-35"
          />
          <Input
            label="Location"
            value={form.location ?? ""}
            onChange={(e) => onUpdate("location", e.target.value)}
            placeholder="e.g. Amsterdam, Netherlands"
          />
          <Input
            label="Occupation"
            value={form.occupation ?? ""}
            onChange={(e) => onUpdate("occupation", e.target.value)}
            placeholder="e.g. CEO & Co-founder"
          />
          <Input
            label="Income"
            value={form.income ?? ""}
            onChange={(e) => onUpdate("income", e.target.value)}
            placeholder="e.g. €80,000-120,000"
          />
          <Input
            label="Family Status"
            value={form.familyStatus ?? ""}
            onChange={(e) => onUpdate("familyStatus", e.target.value)}
            placeholder="e.g. Single, no children"
          />
          <Input
            label="Education"
            value={form.education ?? ""}
            onChange={(e) => onUpdate("education", e.target.value)}
            placeholder="e.g. MSc Computer Science"
          />
        </div>
      </div>

      {/* Avatar */}
      <PersonaImageGenerator
        name={form.name}
        avatarUrl={avatarUrl}
        onAvatarChange={onAvatarChange}
      />
    </div>
  );
}
