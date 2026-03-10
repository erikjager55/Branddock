"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, TypeScaleLevel } from "../types/brandstyle.types";

interface TypographySectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function TypographySection({ styleguide, canEdit }: TypographySectionProps) {
  const typeScale = (styleguide.typeScale ?? []) as TypeScaleLevel[];
  const updateTypography = useUpdateSection("typography");

  const [isEditingFont, setIsEditingFont] = useState(false);
  const [editFontName, setEditFontName] = useState("");
  const [editFontUrl, setEditFontUrl] = useState("");

  const startEditFont = () => {
    setEditFontName(styleguide.primaryFontName ?? "");
    setEditFontUrl(styleguide.primaryFontUrl ?? "");
    setIsEditingFont(true);
  };

  const cancelEditFont = () => {
    setIsEditingFont(false);
  };

  const saveFont = () => {
    updateTypography.mutate(
      {
        primaryFontName: editFontName.trim() || null,
        primaryFontUrl: editFontUrl.trim() || null,
      },
      { onSuccess: () => setIsEditingFont(false) }
    );
  };

  return (
    <div data-testid="typography-section" className="space-y-6">
      {/* Font Preview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Primary Font</h3>
          {canEdit && !isEditingFont && (
            <button
              onClick={startEditFont}
              className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingFont ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Font Name</label>
              <input
                value={editFontName}
                onChange={(e) => setEditFontName(e.target.value)}
                placeholder="e.g. Inter"
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Font URL</label>
              <input
                value={editFontUrl}
                onChange={(e) => setEditFontUrl(e.target.value)}
                placeholder="https://fonts.google.com/..."
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveFont} isLoading={updateTypography.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditFont}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
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
        )}
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
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">
                    Color
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
                    <td className="py-3 pr-4">
                      {level.color ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: level.color }}
                          />
                          <span className="font-mono text-xs text-gray-600">
                            {level.color}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
