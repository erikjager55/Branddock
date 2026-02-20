"use client";

import { Card } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import type { BrandStyleguide, TypeScaleLevel } from "../types/brandstyle.types";

interface TypographySectionProps {
  styleguide: BrandStyleguide;
}

export function TypographySection({ styleguide }: TypographySectionProps) {
  const typeScale = (styleguide.typeScale ?? []) as TypeScaleLevel[];

  return (
    <div data-testid="typography-section" className="space-y-6">
      {/* Font Preview */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Primary Font</h3>
        <div className="space-y-4">
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold text-gray-900">
              {styleguide.primaryFontName ?? "Not set"}
            </span>
            {styleguide.primaryFontUrl && (
              <a
                href={styleguide.primaryFontUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                View font
              </a>
            )}
          </div>

          {/* Alphabet preview */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <p className="text-lg text-gray-800">
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </p>
            <p className="text-lg text-gray-800">
              abcdefghijklmnopqrstuvwxyz
            </p>
            <p className="text-lg text-gray-800">
              0123456789 !@#$%&
            </p>
          </div>
        </div>
      </Card>

      {/* Type Scale */}
      {typeScale.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Type Scale</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                    Preview
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                    Weight
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                    Line Height
                  </th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">
                    Usage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {typeScale.map((level) => (
                  <tr key={level.level}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">
                      {level.level}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="text-gray-900"
                        style={{
                          fontSize: level.size,
                          fontWeight: level.weight,
                          lineHeight: level.lineHeight,
                        }}
                      >
                        {level.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">
                      {level.size}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">
                      {level.weight}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">
                      {level.lineHeight}
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {level.usage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AiContentBanner section="typography" savedForAi={styleguide.typographySavedForAi} />
    </div>
  );
}
