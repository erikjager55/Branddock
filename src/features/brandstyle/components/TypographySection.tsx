"use client";

import { useState, useCallback } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { useUpdateSection } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, TypeScaleLevel } from "../types/brandstyle.types";

const LEVEL_PRESETS = ["H1", "H2", "H3", "H4", "H5", "H6", "Body", "Small", "Caption", "Overline"];

interface TypographySectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

/** Creates a blank type scale entry */
function createBlankLevel(): TypeScaleLevel {
  return { level: "", name: "", size: "", lineHeight: "", weight: "", color: "", usage: "" };
}

export function TypographySection({ styleguide, canEdit }: TypographySectionProps) {
  const typeScale = (styleguide.typeScale ?? []) as TypeScaleLevel[];
  const updateTypography = useUpdateSection("typography");

  // Font editing state
  const [isEditingFont, setIsEditingFont] = useState(false);
  const [editFontName, setEditFontName] = useState("");
  const [editFontUrl, setEditFontUrl] = useState("");

  // Type scale editing state
  const [isEditingScale, setIsEditingScale] = useState(false);
  const [editScale, setEditScale] = useState<TypeScaleLevel[]>([]);

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
      { onSuccess: () => setIsEditingFont(false) },
    );
  };

  const startEditScale = useCallback(() => {
    setEditScale(typeScale.map((l) => ({ ...l })));
    setIsEditingScale(true);
  }, [typeScale]);

  const cancelEditScale = () => {
    setIsEditingScale(false);
  };

  const saveScale = () => {
    const cleaned = editScale.filter((l) => l.level.trim() || l.size.trim());
    updateTypography.mutate({ typeScale: cleaned.length > 0 ? cleaned : null }, {
      onSuccess: () => setIsEditingScale(false),
    });
  };

  const updateScaleRow = (index: number, field: keyof TypeScaleLevel, value: string) => {
    setEditScale((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeScaleRow = (index: number) => {
    setEditScale((prev) => prev.filter((_, i) => i !== index));
  };

  const addScaleRow = () => {
    setEditScale((prev) => [...prev, createBlankLevel()]);
  };

  return (
    <div data-testid="typography-section" className="space-y-6">
      {/* Font Preview */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Primary Font</h3>
          {canEdit && !isEditingFont && (
            <button
              onClick={startEditFont}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
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
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Font URL</label>
              <input
                value={editFontUrl}
                onChange={(e) => setEditFontUrl(e.target.value)}
                placeholder="https://fonts.google.com/..."
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="text-sm text-primary hover:text-primary-700"
                >
                  View font
                </a>
              )}
            </div>

            {/* Alphabet preview */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-lg text-gray-800">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
              <p className="text-lg text-gray-800">abcdefghijklmnopqrstuvwxyz</p>
              <p className="text-lg text-gray-800">0123456789 !@#$%&</p>
            </div>
          </div>
        )}
      </Card>

      {/* Type Scale */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Type Scale</h3>
          {canEdit && !isEditingScale && (
            <button
              onClick={startEditScale}
              className="p-1 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
              title="Edit type scale"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isEditingScale ? (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Level</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Weight</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Line Height</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {editScale.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-2">
                        <select
                          value={LEVEL_PRESETS.includes(row.level) ? row.level : "__custom__"}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateScaleRow(i, "level", val === "__custom__" ? "" : val);
                            if (val !== "__custom__") updateScaleRow(i, "name", val);
                          }}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          {LEVEL_PRESETS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                          <option value="__custom__">Custom...</option>
                        </select>
                        {!LEVEL_PRESETS.includes(row.level) && (
                          <input
                            value={row.level}
                            onChange={(e) => {
                              updateScaleRow(i, "level", e.target.value);
                              updateScaleRow(i, "name", e.target.value);
                            }}
                            placeholder="Custom"
                            className="w-full text-xs px-2 py-1 mt-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.size}
                          onChange={(e) => updateScaleRow(i, "size", e.target.value)}
                          placeholder="36px"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.weight}
                          onChange={(e) => updateScaleRow(i, "weight", e.target.value)}
                          placeholder="bold"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.lineHeight}
                          onChange={(e) => updateScaleRow(i, "lineHeight", e.target.value)}
                          placeholder="1.2"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.color ?? ""}
                          onChange={(e) => updateScaleRow(i, "color", e.target.value)}
                          placeholder="#111827"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.usage ?? ""}
                          onChange={(e) => updateScaleRow(i, "usage", e.target.value)}
                          placeholder="Page titles"
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeScaleRow(i)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addScaleRow}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add level
            </button>

            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" onClick={saveScale} isLoading={updateTypography.isPending}>
                Save
              </Button>
              <Button variant="secondary" size="sm" onClick={cancelEditScale}>
                Cancel
              </Button>
            </div>
          </div>
        ) : typeScale.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Preview</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Weight</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Line Height</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase">Color</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {typeScale.map((level) => (
                  <tr key={level.level}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{level.level}</td>
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
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">{level.size}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">{level.weight}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">{level.lineHeight}</td>
                    <td className="py-3 pr-4">
                      {level.color ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: level.color }}
                          />
                          <span className="font-mono text-xs text-gray-600">{level.color}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-gray-500">{level.usage ?? "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-gray-400">
            <p>No type scale defined yet.</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditScale([createBlankLevel()]);
                  setIsEditingScale(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add type scale
              </button>
            )}
          </div>
        )}
      </Card>

      <AiContentBanner section="typography" savedForAi={styleguide.typographySavedForAi} />
    </div>
  );
}
