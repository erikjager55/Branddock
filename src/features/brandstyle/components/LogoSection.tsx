"use client";

import { CheckCircle, X } from "lucide-react";
import { Card } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import type { BrandStyleguide, LogoVariation } from "../types/brandstyle.types";

interface LogoSectionProps {
  styleguide: BrandStyleguide;
}

export function LogoSection({ styleguide }: LogoSectionProps) {
  const variations = (styleguide.logoVariations ?? []) as LogoVariation[];

  return (
    <div data-testid="logo-section" className="space-y-6">
      {/* Logo Variations */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Logo Variations</h3>
        <div className="grid grid-cols-3 gap-4">
          {variations.map((v, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-lg p-6 flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400 uppercase">{v.type}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{v.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Usage Guidelines */}
      {styleguide.logoGuidelines.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Usage Guidelines</h3>
          <ul className="space-y-2">
            {styleguide.logoGuidelines.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Don'ts */}
      {styleguide.logoDonts.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Don&apos;ts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {styleguide.logoDonts.map((d, i) => (
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

      <AiContentBanner section="logo" savedForAi={styleguide.logoSavedForAi} />
    </div>
  );
}
