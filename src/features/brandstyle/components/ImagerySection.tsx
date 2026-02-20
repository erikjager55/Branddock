"use client";

import { CheckCircle, X } from "lucide-react";
import { Card } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import type { BrandStyleguide, PhotographyStyle } from "../types/brandstyle.types";

interface ImagerySectionProps {
  styleguide: BrandStyleguide;
}

export function ImagerySection({ styleguide }: ImagerySectionProps) {
  const photoStyle = styleguide.photographyStyle as PhotographyStyle | null;

  return (
    <div data-testid="imagery-section" className="space-y-6">
      {/* Photography */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Photography Style</h3>
        {photoStyle && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {photoStyle.mood && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Mood</p>
                <p className="text-sm text-gray-700">{photoStyle.mood}</p>
              </div>
            )}
            {photoStyle.subjects && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Subjects</p>
                <p className="text-sm text-gray-700">{photoStyle.subjects}</p>
              </div>
            )}
            {photoStyle.composition && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Composition</p>
                <p className="text-sm text-gray-700">{photoStyle.composition}</p>
              </div>
            )}
          </div>
        )}
        {styleguide.photographyGuidelines.length > 0 && (
          <ul className="space-y-2">
            {styleguide.photographyGuidelines.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Illustration */}
      {styleguide.illustrationGuidelines.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Illustration Guidelines
          </h3>
          <ul className="space-y-2">
            {styleguide.illustrationGuidelines.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Don'ts */}
      {styleguide.imageryDonts.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Don&apos;ts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {styleguide.imageryDonts.map((d, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-gray-600 p-3 bg-red-50 rounded-lg"
              >
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                {d}
              </div>
            ))}
          </div>
        </Card>
      )}

      <AiContentBanner section="imagery" savedForAi={styleguide.imagerySavedForAi} />
    </div>
  );
}
