"use client";

import { Input } from "@/components/shared";
import { RepeatableListInput } from "./RepeatableListInput";
import type { CreatePersonaBody } from "../../types/persona.types";

interface PsychographicsTabProps {
  form: CreatePersonaBody;
  onUpdate: <K extends keyof CreatePersonaBody>(
    key: K,
    value: CreatePersonaBody[K],
  ) => void;
}

export function PsychographicsTab({ form, onUpdate }: PsychographicsTabProps) {
  return (
    <div className="space-y-6">
      {/* Personality Type */}
      <Input
        label="Personality Type"
        value={form.personalityType ?? ""}
        onChange={(e) => onUpdate("personalityType", e.target.value)}
        placeholder="e.g. ENTJ - The Commander"
      />

      {/* Core Values (tag input) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Core Values
        </label>
        <TagInput
          items={form.coreValues ?? []}
          onChange={(items) => onUpdate("coreValues", items)}
          placeholder="Type a value and press Enter..."
          max={10}
          colorClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      {/* Interests (tag input) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Interests
        </label>
        <TagInput
          items={form.interests ?? []}
          onChange={(items) => onUpdate("interests", items)}
          placeholder="Type an interest and press Enter..."
          max={10}
          colorClass="bg-blue-50 text-blue-700"
        />
      </div>

      {/* Goals */}
      <RepeatableListInput
        label="Goals"
        items={form.goals ?? []}
        onChange={(items) => onUpdate("goals", items)}
        placeholder="Add a goal..."
      />

      {/* Motivations */}
      <RepeatableListInput
        label="Motivations"
        items={form.motivations ?? []}
        onChange={(items) => onUpdate("motivations", items)}
        placeholder="Add a motivation..."
      />
    </div>
  );
}

// ─── Tag Input Sub-component ───────────────────────────────

interface TagInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  max: number;
  colorClass: string;
}

function TagInput({ items, onChange, placeholder, max, colorClass }: TagInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = e.currentTarget.value.trim();
      if (value && items.length < max && !items.includes(value)) {
        onChange([...items, value]);
        e.currentTarget.value = "";
      }
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}
          >
            {item}
            <button
              onClick={() => removeItem(i)}
              className="ml-0.5 hover:opacity-70"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {items.length < max && (
        <input
          type="text"
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      )}
    </div>
  );
}
