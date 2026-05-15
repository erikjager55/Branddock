"use client";

import { useCallback, useState } from "react";
import { Plus, X, Hash, Ban, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/shared";
import { AiContentBanner } from "../AiContentBanner";
import { useUpdateVoiceguide } from "../../hooks";
import type { BrandVoiceguide, ExamplePhrase } from "../../types/voiceguide.types";

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

/** Do/Don't fraserings-voorbeelden — verhuisd uit BrandStyleguide.examplePhrases (ADR 2026-05-15). */
function ExamplePhrasesEditor({ voiceguide }: { voiceguide: BrandVoiceguide }) {
  const update = useUpdateVoiceguide();
  const examples = voiceguide.examplePhrases ?? [];
  const doExamples = examples.filter((e) => e.type === "do");
  const dontExamples = examples.filter((e) => e.type === "dont");

  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<ExamplePhrase[]>([]);

  const startEdit = useCallback(() => {
    setEditItems(examples.map((e) => ({ ...e })));
    setIsEditing(true);
  }, [examples]);

  const cancel = () => setIsEditing(false);

  const save = () => {
    const cleaned = editItems.filter((e) => e.text.trim());
    update.mutate(
      { examplePhrases: cleaned.length > 0 ? cleaned : null },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const updateText = (idx: number, text: string) => {
    setEditItems((prev) => prev.map((e, i) => (i === idx ? { ...e, text } : e)));
  };

  const remove = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addExample = (type: "do" | "dont") => {
    setEditItems((prev) => [...prev, { text: "", type }]);
  };

  const editDo = editItems
    .map((e, i) => ({ ...e, originalIndex: i }))
    .filter((e) => e.type === "do");
  const editDont = editItems
    .map((e, i) => ({ ...e, originalIndex: i }))
    .filter((e) => e.type === "dont");

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Do / Don&apos;t examples</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-emerald-700 mb-3">Do</h4>
            <div className="space-y-2">
              {editDo.map((e) => (
                <div key={e.originalIndex} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <input
                    value={e.text}
                    onChange={(ev) => updateText(e.originalIndex, ev.target.value)}
                    placeholder="e.g. We're here to help you succeed."
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 italic"
                  />
                  <button
                    type="button"
                    onClick={() => remove(e.originalIndex)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addExample("do")}
                className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 transition-colors mt-1"
              >
                <Plus className="w-4 h-4" />
                Add &ldquo;do&rdquo;
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-3">Don&apos;t</h4>
            <div className="space-y-2">
              {editDont.map((e) => (
                <div key={e.originalIndex} className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <input
                    value={e.text}
                    onChange={(ev) => updateText(e.originalIndex, ev.target.value)}
                    placeholder="e.g. Dear valued customer..."
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-300 italic"
                  />
                  <button
                    type="button"
                    onClick={() => remove(e.originalIndex)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addExample("dont")}
                className="flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 transition-colors mt-1"
              >
                <Plus className="w-4 h-4" />
                Add &ldquo;don&apos;t&rdquo;
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-4">
          <Button variant="primary" size="sm" onClick={save} isLoading={update.isPending}>
            Save
          </Button>
          <Button variant="secondary" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (examples.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Do / Don&apos;t examples</h3>
        <p className="text-xs text-gray-500 mb-3">
          Concrete fraserings-voorbeelden die laten zien hoe het merk wel en niet schrijft.
        </p>
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add examples
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Do / Don&apos;t examples</h3>
        <button
          onClick={startEdit}
          className="p-1 text-gray-400 hover:text-primary transition-colors"
          aria-label="Edit examples"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doExamples.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-emerald-700 mb-2">Do</h4>
            <div className="space-y-2">
              {doExamples.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-2 bg-emerald-50 rounded-md">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="italic">&ldquo;{e.text}&rdquo;</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {dontExamples.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-700 mb-2">Don&apos;t</h4>
            <div className="space-y-2">
              {dontExamples.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-2 bg-red-50 rounded-md">
                  <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="italic">&ldquo;{e.text}&rdquo;</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

      <ExamplePhrasesEditor voiceguide={voiceguide} />

      <div className="grid sm:grid-cols-2 gap-4">
        <AiContentBanner section="vocabulary" savedForAi={voiceguide.vocabularySavedForAi} />
        <AiContentBanner section="anti-patterns" savedForAi={voiceguide.antiPatternsSavedForAi} />
      </div>
    </div>
  );
}
