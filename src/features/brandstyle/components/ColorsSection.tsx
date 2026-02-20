"use client";

import { X } from "lucide-react";
import { Card } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface ColorsSectionProps {
  styleguide: BrandStyleguide;
}

export function ColorsSection({ styleguide }: ColorsSectionProps) {
  const { openColorModal } = useBrandstyleStore();

  const colorsByCategory = styleguide.colors.reduce(
    (acc, c) => {
      const cat = c.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    },
    {} as Record<string, typeof styleguide.colors>
  );

  const categoryOrder = ["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"];

  return (
    <div data-testid="colors-section" className="space-y-6">
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Color Palette</h3>
        <div className="space-y-6">
          {categoryOrder.map((cat) => {
            const colors = colorsByCategory[cat];
            if (!colors?.length) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {cat}
                </p>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      data-testid="color-swatch"
                      onClick={() => openColorModal(color.id)}
                      className="group flex flex-col items-center gap-2"
                    >
                      <div
                        className="w-16 h-16 rounded-lg border border-gray-200 group-hover:ring-2 group-hover:ring-teal-500 transition-all"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="text-center">
                        <p className="text-xs font-medium text-gray-700">
                          {color.name}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase">
                          {color.hex}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Color Don'ts */}
      {styleguide.colorDonts.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Don&apos;ts</h3>
          <div className="space-y-2">
            {styleguide.colorDonts.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                {d}
              </div>
            ))}
          </div>
        </Card>
      )}

      <AiContentBanner section="colors" savedForAi={styleguide.colorsSavedForAi} />
    </div>
  );
}
