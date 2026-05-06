"use client";

import { useState } from "react";
import { Plus, X, Hash, Ban } from "lucide-react";
import { Button } from "@/components/shared";
import { AiContentBanner } from "../AiContentBanner";
import { useUpdateVoiceguide } from "../../hooks";
import type { BrandVoiceguide } from "../../types/voiceguide.types";

interface VocabularySectionProps {
  voiceguide: BrandVoiceguide;
}

interface ChipListProps {
  label: string;
  description: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
  accent: "teal" | "rose" | "amber";
  icon: React.ElementType;
}

const ACCENT_STYLES = {
  teal: { chip: "bg-teal-50 text-teal-700 border-teal-200", icon: "text-teal-600" },
  rose: { chip: "bg-rose-50 text-rose-700 border-rose-200", icon: "text-rose-600" },
  amber: { chip: "bg-amber-50 text-amber-700 border-amber-200", icon: "text-amber-600" },
} as const;

function ChipList({ label, description, items, placeholder, onChange, accent, icon: Icon }: ChipListProps) {
  const [draft, setDraft] = useState("");
  const styles = ACCENT_STYLES[accent];

  const handleAdd = () => {
    const value = draft.trim();
    if (!value) return;
    if (items.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${styles.icon}`} />
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <span className="text-xs text-gray-400 ml-auto">{items.length}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.length === 0 && (
          <span className="text-xs text-gray-400 italic">No entries yet</span>
        )}
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs ${styles.chip}`}
          >
            {item}
            <button
              onClick={() => handleRemove(i)}
              className="hover:opacity-70 transition-opacity"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <Button variant="secondary" size="sm" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

export function VocabularySection({ voiceguide }: VocabularySectionProps) {
  const update = useUpdateVoiceguide();

  return (
    <div className="space-y-6">
      <ChipList
        label="Words we use"
        description="Vocabulary that fits the brand. Single words, not phrases."
        items={voiceguide.wordsWeUse}
        placeholder="e.g. craft, deliberate, pragmatic"
        accent="teal"
        icon={Hash}
        onChange={(items) => update.mutate({ wordsWeUse: items })}
      />

      <ChipList
        label="Words we avoid"
        description="Single words that feel off-brand. Auto-syncs to BrandRule (warning)."
        items={voiceguide.wordsWeAvoid}
        placeholder="e.g. revolutionary, leverage, synergy"
        accent="rose"
        icon={Ban}
        onChange={(items) => update.mutate({ wordsWeAvoid: items })}
      />

      <ChipList
        label="Anti-patterns"
        description="Multi-word phrases the brand should never use. Stronger signal — auto-syncs to BrandRule (error severity)."
        items={voiceguide.antiPatterns}
        placeholder="e.g. game-changer, in today's fast-paced world"
        accent="amber"
        icon={Ban}
        onChange={(items) => update.mutate({ antiPatterns: items })}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <AiContentBanner section="vocabulary" savedForAi={voiceguide.vocabularySavedForAi} />
        <AiContentBanner section="anti-patterns" savedForAi={voiceguide.antiPatternsSavedForAi} />
      </div>
    </div>
  );
}
