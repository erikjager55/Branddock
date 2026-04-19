"use client";

import { AlertTriangle, Upload } from "lucide-react";
import type { BrandStyleguide } from "../../types/brandstyle.types";
import { ACTIVE_REVIEW_SECTIONS, REVIEW_SECTION_LABELS } from "@/lib/brandstyle/review-sections";
import { PublishToggle } from "./PublishToggle";
import { useBrandstyleStore } from "../../stores/useBrandstyleStore";

interface ReviewSummaryHeaderProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

export function ReviewSummaryHeader({ styleguide, canEdit }: ReviewSummaryHeaderProps) {
  const reviews = styleguide.reviews ?? [];
  const approvedSet = new Set(
    reviews.filter((r) => r.status === "APPROVED").map((r) => r.section),
  );
  const needsWork = reviews.filter((r) => r.status === "NEEDS_WORK");
  const pendingSections = ACTIVE_REVIEW_SECTIONS.filter((s) => !approvedSet.has(s));
  const reviewCount = pendingSections.length;

  const total = ACTIVE_REVIEW_SECTIONS.length;
  const approved = total - reviewCount;
  const progressPct = total > 0 ? Math.round((approved / total) * 100) : 0;

  const missingFonts = (styleguide.fonts ?? []).filter(
    (f) => f.source === "DETECTED" && !f.fileUrl,
  );
  const { setActiveTab, openFontUpload } = useBrandstyleStore();

  const handleUploadFonts = () => {
    setActiveTab("brand_assets");
    openFontUpload();
  };

  const jumpToSection = (section: string) => {
    if (section === "brand-assets-logos" || section === "brand-assets-fonts") {
      setActiveTab("brand_assets");
    } else if (section === "colors") {
      setActiveTab("colors");
    } else if (section === "typography") {
      setActiveTab("typography");
    } else if (section === "tone-of-voice") {
      setActiveTab("tone_of_voice");
    } else if (section === "imagery") {
      setActiveTab("imagery");
    } else if (section === "visual-system") {
      setActiveTab("visual_system");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Review draft design system</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {reviewCount === 0
              ? "Everything approved — styleguide is ready to publish."
              : `${approved} of ${total} sections approved · ${reviewCount} still need${
                  reviewCount === 1 ? "s" : ""
                } review.`}
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <PublishToggle
          published={styleguide.published ?? false}
          reviews={reviews}
          disabled={!canEdit}
        />
      </div>

      {/* Missing brand fonts warning */}
      {missingFonts.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-medium">Missing brand fonts.</span> Claude is rendering
              typography with substitute web fonts.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleUploadFonts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-amber-300 rounded-md text-amber-900 hover:bg-amber-100 transition-colors flex-shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload fonts
            </button>
          )}
        </div>
      )}

      {/* Needs review jump-list */}
      {reviewCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-gray-700">Needs review</span>
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-medium text-blue-700 bg-blue-100 rounded-full">
            {reviewCount}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {pendingSections.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => jumpToSection(s)}
                className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {REVIEW_SECTION_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsWork.length > 0 && (
        <div className="text-xs text-red-700">
          <span className="font-semibold">Needs work:</span>{" "}
          {needsWork.map((r) => REVIEW_SECTION_LABELS[r.section as keyof typeof REVIEW_SECTION_LABELS] ?? r.section).join(", ")}
        </div>
      )}
    </div>
  );
}
