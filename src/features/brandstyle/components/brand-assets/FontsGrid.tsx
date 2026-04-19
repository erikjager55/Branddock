"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Card, Button } from "@/components/shared";
import type { StyleguideFontData, FontRole } from "../../types/brandstyle.types";
import { FontCard } from "./FontCard";
import { FontUploadModal } from "./FontUploadModal";

interface FontsGridProps {
  fonts: StyleguideFontData[];
  canEdit: boolean;
  /** Optional review panel rendered inside the same card. */
  reviewSlot?: React.ReactNode;
}

const ROLE_ORDER: FontRole[] = ["DISPLAY", "UI", "EYEBROW_META", "BODY"];
const ROLE_HEADER: Record<FontRole, string> = {
  DISPLAY: "Display type",
  UI: "UI type",
  EYEBROW_META: "Eyebrow & meta",
  BODY: "Body",
};

export function FontsGrid({ fonts, canEdit, reviewSlot }: FontsGridProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preset, setPreset] = useState<{ name?: string; role?: FontRole }>({});

  const openUpload = (name?: string, role?: FontRole) => {
    setPreset({ name, role });
    setUploadOpen(true);
  };

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    fonts: fonts.filter((f) => f.role === role),
  }));

  const missingCount = fonts.filter((f) => f.source === "DETECTED" && !f.fileUrl).length;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Fonts</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload font files so previews and exports use the real brand type.
          </p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => openUpload()}>
            Upload font
          </Button>
        )}
      </div>

      {missingCount > 0 && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Upload className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {missingCount} brand {missingCount === 1 ? "font" : "fonts"} missing their file
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Claude is rendering previews with substitute web fonts. Click &quot;Upload&quot; on each card below to add the real file.
            </p>
          </div>
        </div>
      )}

      {fonts.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No fonts detected yet. Run an analysis or upload fonts manually.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ role, fonts: roleFonts }) => {
            if (roleFonts.length === 0) return null;
            return (
              <div key={role}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  {ROLE_HEADER[role]}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {roleFonts.map((font) => (
                    <FontCard
                      key={font.id}
                      font={font}
                      canEdit={canEdit}
                      onUploadClick={(name, r) => openUpload(name, r)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewSlot}
      <FontUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        presetName={preset.name}
        presetRole={preset.role}
      />
    </Card>
  );
}
