"use client";

import { CheckCircle, X } from "lucide-react";
import { Card } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import type { BrandStyleguide, ExamplePhrase } from "../types/brandstyle.types";

interface ToneOfVoiceSectionProps {
  styleguide: BrandStyleguide;
}

export function ToneOfVoiceSection({ styleguide }: ToneOfVoiceSectionProps) {
  const examples = (styleguide.examplePhrases ?? []) as ExamplePhrase[];
  const doExamples = examples.filter((e) => e.type === "do");
  const dontExamples = examples.filter((e) => e.type === "dont");

  return (
    <div data-testid="tone-of-voice-section" className="space-y-6">
      {/* Content Guidelines */}
      {styleguide.contentGuidelines.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Content Guidelines
          </h3>
          <ol className="space-y-2">
            {styleguide.contentGuidelines.map((g, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {g}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Writing Guidelines */}
      {styleguide.writingGuidelines.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Writing Guidelines
          </h3>
          <ul className="space-y-2">
            {styleguide.writingGuidelines.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </Card>
      )}

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
