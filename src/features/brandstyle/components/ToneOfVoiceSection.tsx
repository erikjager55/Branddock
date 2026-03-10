"use client";

import { CheckCircle, X, Eye, Lightbulb } from "lucide-react";
import { Card } from "@/components/shared";
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
      {examples.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doExamples.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-emerald-700 mb-3">
                Do
              </h3>
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
              <h3 className="text-sm font-semibold text-red-700 mb-3">
                Don&apos;t
              </h3>
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
      )}

      <AiContentBanner section="tone-of-voice" savedForAi={styleguide.toneSavedForAi} />
    </div>
  );
}
