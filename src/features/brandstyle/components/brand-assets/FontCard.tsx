"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Upload, Type as TypeIcon } from "lucide-react";
import { Button } from "@/components/shared";
import type { StyleguideFontData, FontRole } from "../../types/brandstyle.types";
import { useDeleteFont } from "../../hooks/useBrandstyleHooks";

interface FontCardProps {
  font: StyleguideFontData;
  canEdit: boolean;
  onUploadClick: (presetName: string, presetRole: FontRole) => void;
}

const ROLE_LABEL: Record<FontRole, string> = {
  DISPLAY: "Display type",
  UI: "UI type",
  EYEBROW_META: "Eyebrow & meta",
  BODY: "Body",
};

export function FontCard({ font, canEdit, onUploadClick }: FontCardProps) {
  const [imgError, setImgError] = useState(false);
  const deleteFontMut = useDeleteFont();
  const missing = font.source === "DETECTED" && !font.fileUrl;

  const fontFamily = font.fontFamily ?? font.name;
  const previewStyle = !missing
    ? ({ fontFamily: `"${fontFamily}", system-ui, sans-serif` } as const)
    : undefined;

  const handleReplace = () => onUploadClick(font.name, font.role);
  const handleDelete = () => {
    if (!canEdit) return;
    const confirmed = window.confirm(`Delete "${font.name}"? This cannot be undone.`);
    if (confirmed) deleteFontMut.mutate(font.id);
  };

  return (
    <div
      className={`relative border rounded-lg p-4 ${
        missing ? "border-amber-300 bg-amber-50/40" : "border-gray-200 bg-white"
      }`}
      data-testid={`font-card-${font.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">
            {ROLE_LABEL[font.role]}
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">{font.name}</p>
          {font.weight && (
            <p className="text-xs text-gray-500 mt-0.5">Weight: {font.weight}</p>
          )}
        </div>
        {missing ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            Missing file
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Uploaded
          </span>
        )}
      </div>

      {/* Preview */}
      <div className="h-20 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-md overflow-hidden">
        {missing ? (
          <div className="flex flex-col items-center gap-1 text-amber-500">
            <TypeIcon className="h-5 w-5" />
            <span className="text-xs">No preview available</span>
          </div>
        ) : imgError ? (
          <span className="text-xs text-gray-400">Preview failed</span>
        ) : (
          <span
            className="text-3xl text-gray-900"
            style={previewStyle}
            onAnimationEnd={() => setImgError(false)}
          >
            Aa Bb 123
          </span>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            icon={Upload}
            onClick={handleReplace}
            disabled={deleteFontMut.isPending}
          >
            {missing ? "Upload" : "Replace"}
          </Button>
          {!missing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteFontMut.isPending}
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
              aria-label="Delete font"
              title="Delete font"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
