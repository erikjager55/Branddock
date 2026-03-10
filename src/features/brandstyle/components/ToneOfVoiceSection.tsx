"use client";

import { useState, useCallback } from "react";
import { CheckCircle, X, Eye, Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, ExamplePhrase } from "../types/brandstyle.types";

/** Parse "OBSERVED:" or "RECOMMENDED:" prefix from a guideline string */
function parseGuidelinePrefix(text: string): { prefix: "observed" | "recommended" | null; content: string } {
  const upper = text.trimStart().toUpperCase();
  if (upper.startsWith("OBSERVED:")) return { prefix: "observed", content: text.replace(/^OBSERVED:\s*/i, "") };
  if (upper.startsWith("RECOMMENDED:")) return { prefix: "recommended", content: text.replace(/^RECOMMENDED:\s*/i, "") };
  return { prefix: null, content: text };
}

/** Visual badge for OBSERVED/RECOMMENDED guidelines */
function GuidelineBadge({ type }: { type: "observed" | "recommended" }) {
  if (type === "observed") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-600 flex-shrink-0">
        <Eye className="w-3 h-3" />
        Observed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 flex-shrink-0">
      <Lightbulb className="w-3 h-3" />
      Recommended
    </span>
  );
}

interface ToneOfVoiceSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function ToneOfVoiceSection({ styleguide, canEdit }: ToneOfVoiceSectionProps) {
  const examples = (styleguide.examplePhrases ?? []) as ExamplePhrase[];
  const doExamples = examples.filter((e) => e.type === "do");
  const dontExamples = examples.filter((e) => e.type === "dont");
  const updateTone = useUpdateSection("tone-of-voice");

  // Example phrases editing state
  const [isEditingExamples, setIsEditingExamples] = useState(false);
  const [editExamples, setEditExamples] = useState<ExamplePhrase[]>([]);

  const startEditExamples = useCallback(() => {
    setEditExamples(examples.map((e) => ({ ...e })));
    setIsEditingExamples(true);
  }, [examples]);

  const cancelEditExamples = () => {
    setIsEditingExamples(false);
  };

  const saveExamples = () => {
    const cleaned = editExamples.filter((e) => e.text.trim());
    updateTone.mutate(
      { examplePhrases: cleaned.length > 0 ? cleaned : null },
      { onSuccess: () => setIsEditingExamples(false) },
    );
  };

  const updateExample = (index: number, text: string) => {
    setEditExamples((prev) => prev.map((e, i) => (i === index ? { ...e, text } : e)));
  };

  const removeExample = (index: number) => {
    setEditExamples((prev) => prev.filter((_, i) => i !== index));
  };

  const addExample = (type: "do" | "dont") => {
    setEditExamples((prev) => [...prev, { text: "", type }]);
  };

  // Split edit examples by type for rendering
  const editDoExamples = editExamples
    .map((e, i) => ({ ...e, originalIndex: i }))
    .filter((e) => e.type === "do");
  const editDontExamples = editExamples
    .map((e, i) => ({ ...e, originalIndex: i }))
    .filter((e) => e.type === "dont");

  return (
    <div data-testid="tone-of-voice-section" className="space-y-6">
      {/* Content Guidelines */}
      <Card>
        <EditableStringList
          title="Content Guidelines"
          items={styleguide.contentGuidelines}
          canEdit={canEdit}
          isSaving={updateTone.isPending}
          placeholder="Add a content guideline..."
          onSave={(items) => updateTone.mutate({ contentGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ol className="space-y-3">
                {items.map((g, i) => {
                  const { prefix, content } = parseGuidelinePrefix(g);
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-1">
                        {prefix && <GuidelineBadge type={prefix} />}
                        <span>{content}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-gray-400">No content guidelines yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      {/* Writing Guidelines */}
      <Card>
        <EditableStringList
          title="Writing Guidelines"
          items={styleguide.writingGuidelines}
          canEdit={canEdit}
          isSaving={updateTone.isPending}
          placeholder="Add a writing guideline..."
          onSave={(items) => updateTone.mutate({ writingGuidelines: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((g, i) => {
                  const { prefix, content } = parseGuidelinePrefix(g);
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        {prefix && <GuidelineBadge type={prefix} />}
                        <span>{content}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No writing guidelines yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      {/* Do / Don't Examples */}
      {isEditingExamples ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Do / Don&apos;t Examples</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Do column */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-3">Do</h4>
              <div className="space-y-2">
                {editDoExamples.map((e) => (
                  <div key={e.originalIndex} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <input
                      value={e.text}
                      onChange={(ev) => updateExample(e.originalIndex, ev.target.value)}
                      placeholder="e.g. We're here to help you succeed."
                      className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 italic"
                    />
                    <button
                      type="button"
                      onClick={() => removeExample(e.originalIndex)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addExample("do")}
                  className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 transition-colors mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Add &ldquo;do&rdquo;
                </button>
              </div>
            </div>

            {/* Don't column */}
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-3">Don&apos;t</h4>
              <div className="space-y-2">
                {editDontExamples.map((e) => (
                  <div key={e.originalIndex} className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <input
                      value={e.text}
                      onChange={(ev) => updateExample(e.originalIndex, ev.target.value)}
                      placeholder="e.g. Dear valued customer..."
                      className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 italic"
                    />
                    <button
                      type="button"
                      onClick={() => removeExample(e.originalIndex)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addExample("dont")}
                  className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 transition-colors mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Add &ldquo;don&apos;t&rdquo;
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="primary" size="sm" onClick={saveExamples} isLoading={updateTone.isPending}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelEditExamples}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {examples.length > 0 ? (
            <div className="relative">
              {canEdit && (
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={startEditExamples}
                    className="p-1 text-gray-400 hover:text-teal-600 transition-colors bg-white rounded"
                    title="Edit examples"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doExamples.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-emerald-700 mb-3">Do</h3>
                    <div className="space-y-2">
                      {doExamples.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-2 bg-emerald-50 rounded-md">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="italic">&ldquo;{e.text}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {dontExamples.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-red-700 mb-3">Don&apos;t</h3>
                    <div className="space-y-2">
                      {dontExamples.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 p-2 bg-red-50 rounded-md">
                          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span className="italic">&ldquo;{e.text}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          ) : canEdit ? (
            <Card>
              <div className="py-4 text-center text-sm text-gray-400">
                <p>No do/don&apos;t examples yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditExamples([
                      { text: "", type: "do" },
                      { text: "", type: "dont" },
                    ]);
                    setIsEditingExamples(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add examples
                </button>
              </div>
            </Card>
          ) : null}
        </>
      )}

      <AiContentBanner section="tone-of-voice" savedForAi={styleguide.toneSavedForAi} />
    </div>
  );
}
