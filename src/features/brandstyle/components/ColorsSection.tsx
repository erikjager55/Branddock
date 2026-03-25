"use client";

import { useState } from "react";
import { X, Pencil, Plus } from "lucide-react";
import { Card, Button } from "@/components/shared";
import { AiContentBanner } from "./AiContentBanner";
import { EditableStringList } from "./EditableStringList";
import { useBrandstyleStore } from "../stores/useBrandstyleStore";
import { useUpdateSection, useAddColor, useDeleteColor } from "../hooks/useBrandstyleHooks";
import type { BrandStyleguide, StyleguideColor } from "../types/brandstyle.types";

const CATEGORY_OPTIONS: StyleguideColor["category"][] = ["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"];

interface ColorsSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

/** Inline form for adding a new color */
function AddColorForm({
  onAdd,
  onCancel,
  isAdding,
}: {
  onAdd: (data: { name: string; hex: string; category: StyleguideColor["category"] }) => void;
  onCancel: () => void;
  isAdding: boolean;
}) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#");
  const [category, setCategory] = useState<StyleguideColor["category"]>("PRIMARY");

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(hex);

  const handleSubmit = () => {
    if (!name.trim() || !isValidHex) return;
    onAdd({ name: name.trim(), hex, category });
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ocean Blue"
            className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Hex</label>
          <div className="flex items-center gap-2">
            <input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              placeholder="#2563EB"
              maxLength={7}
              className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <span
              className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: isValidHex ? hex : "transparent" }}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as StyleguideColor["category"])}
            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isAdding}>
            Add
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ColorsSection({ styleguide, canEdit }: ColorsSectionProps) {
  const { openColorModal } = useBrandstyleStore();
  const updateColors = useUpdateSection("colors");
  const addColorMutation = useAddColor();
  const deleteColorMutation = useDeleteColor();

  const [isEditingColors, setIsEditingColors] = useState(false);
  const [showAddColorForm, setShowAddColorForm] = useState(false);

  const colorsByCategory = styleguide.colors.reduce(
    (acc, c) => {
      const cat = c.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    },
    {} as Record<string, typeof styleguide.colors>,
  );

  const categoryOrder = ["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"];

  const handleAddColor = (data: { name: string; hex: string; category: StyleguideColor["category"] }) => {
    addColorMutation.mutate(data, {
      onSuccess: () => setShowAddColorForm(false),
    });
  };

  const handleDeleteColor = (colorId: string) => {
    deleteColorMutation.mutate(colorId);
  };

  return (
    <div data-testid="colors-section" className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 truncate min-w-0">Color Palette</h3>
          {canEdit && (
            <button
              onClick={() => setIsEditingColors((v) => !v)}
              className="p-1 text-gray-400 hover:text-teal-600 transition-colors flex-shrink-0"
              title={isEditingColors ? "Done editing" : "Edit colors"}
            >
              {isEditingColors ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        <div className="space-y-6">
          {categoryOrder.map((cat) => {
            const colors = colorsByCategory[cat];
            if (!colors?.length) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{cat}</p>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <div key={color.id} className="relative group">
                      <button
                        data-testid="color-swatch"
                        onClick={() => !isEditingColors && openColorModal(color.id)}
                        className="flex flex-col items-center gap-2"
                        disabled={isEditingColors}
                      >
                        <div
                          className="w-16 h-16 rounded-lg border border-gray-200 group-hover:ring-2 group-hover:ring-teal-500 transition-all"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700">{color.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{color.hex}</p>
                        </div>
                      </button>

                      {/* Delete overlay in edit mode */}
                      {isEditingColors && (
                        <button
                          type="button"
                          onClick={() => handleDeleteColor(color.id)}
                          className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Remove color"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit mode: add color */}
        {isEditingColors && (
          <div className="mt-4">
            {showAddColorForm ? (
              <AddColorForm
                onAdd={handleAddColor}
                onCancel={() => setShowAddColorForm(false)}
                isAdding={addColorMutation.isPending}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddColorForm(true)}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add color
              </button>
            )}
          </div>
        )}

        {/* Show add button when no colors exist */}
        {canEdit && !isEditingColors && styleguide.colors.length === 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setIsEditingColors(true);
                setShowAddColorForm(true);
              }}
              className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add colors manually
            </button>
          </div>
        )}
      </Card>

      {/* Color Don'ts */}
      <Card>
        <EditableStringList
          title="Don'ts"
          items={styleguide.colorDonts}
          canEdit={canEdit}
          isSaving={updateColors.isPending}
          placeholder="Add a color don't..."
          onSave={(items) => updateColors.mutate({ colorDonts: items })}
        >
          {(items) =>
            items.length > 0 ? (
              <div className="space-y-2">
                {items.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No color don&apos;ts defined yet.</p>
            )
          }
        </EditableStringList>
      </Card>

      <AiContentBanner section="colors" savedForAi={styleguide.colorsSavedForAi} />
    </div>
  );
}
