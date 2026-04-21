"use client";

import { useMemo } from "react";
import { AlertTriangle, Upload, ArrowRight, Check, X } from "lucide-react";
import type {
  BrandStyleguide,
  ComponentTypeKey,
  StyleguideTab,
} from "../../types/brandstyle.types";
import {
  getApplicableReviewSections,
  REVIEW_SECTION_LABELS,
  type ReviewSectionKey,
} from "@/lib/brandstyle/review-sections";
import { useBrandstyleStore } from "../../stores/useBrandstyleStore";
import { useFinalizeReview } from "../../hooks/useBrandstyleHooks";

interface ReviewSummaryHeaderProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

/**
 * Tab-grouping for the progress grid. Keeps the display consistent with the
 * tab bar order (Brand Assets → Colors → Typography → Spacing → Components
 * → Tone of Voice → Imagery → Visual System).
 */
const GROUPS: Array<{
  label: string;
  tab: StyleguideTab;
  sections: ReviewSectionKey[];
}> = [
  { label: "Brand Assets", tab: "brand_assets", sections: ["brand-assets-logos", "brand-assets-fonts"] },
  { label: "Colors", tab: "colors", sections: ["colors-brand", "colors-neutrals", "colors-semantic"] },
  { label: "Typography", tab: "typography", sections: ["typography-display", "typography-ui", "typography-eyebrow"] },
  { label: "Spacing", tab: "spacing", sections: ["spacing-scale", "spacing-radii", "spacing-shadow"] },
  {
    label: "Components",
    tab: "components",
    sections: [
      "components-buttons",
      "components-form-inputs",
      "components-status-chips",
      "components-product-cards",
      "components-feature-icons",
      "components-top-navigation",
      "components-quote-blocks",
    ],
  },
  // Tone of Voice, Imagery and Visual System were intentionally dropped
  // from the review gate — those tabs are AI-generated reference content
  // that users consume rather than approve token-by-token.
];

function tabForSection(section: string): StyleguideTab {
  const group = GROUPS.find((g) => g.sections.includes(section as ReviewSectionKey));
  return group?.tab ?? "brand_assets";
}

/** Map a Components review-section key back to the internal sub-tab key
 *  (ComponentType) so the Continue-review flow can auto-select it. */
const COMPONENTS_SECTION_TO_TYPE: Record<string, ComponentTypeKey> = {
  "components-buttons": "BUTTON",
  "components-form-inputs": "FORM_INPUT",
  "components-status-chips": "STATUS_CHIP",
  "components-product-cards": "PRODUCT_CARD",
  "components-feature-icons": "FEATURE_ICON",
  "components-top-navigation": "TOP_NAVIGATION",
  "components-quote-blocks": "QUOTE_BLOCK",
};
function componentSectionToTypeKey(section: string): ComponentTypeKey | null {
  return COMPONENTS_SECTION_TO_TYPE[section] ?? null;
}

export function ReviewSummaryHeader({ styleguide, canEdit }: ReviewSummaryHeaderProps) {
  const reviews = styleguide.reviews ?? [];
  const approvedSet = useMemo(
    () => new Set(reviews.filter((r) => r.status === "APPROVED").map((r) => r.section)),
    [reviews],
  );
  const needsWorkSet = useMemo(
    () => new Set(reviews.filter((r) => r.status === "NEEDS_WORK").map((r) => r.section)),
    [reviews],
  );
  const activeSections = useMemo(() => getApplicableReviewSections(styleguide), [styleguide]);
  const activeSet = useMemo(() => new Set<string>(activeSections), [activeSections]);

  const total = activeSections.length;
  const approved = activeSections.filter((s) => approvedSet.has(s)).length;
  const reviewCount = total - approved;
  const progressPct = total > 0 ? Math.round((approved / total) * 100) : 0;

  // First section the user hasn't actioned yet drives the "Continue review"
  // CTA. Both APPROVED and NEEDS_WORK count as "actioned" — NEEDS_WORK is
  // a conscious decision ("I've flagged this, come back to it later"), so
  // the button shouldn't keep sending the user back to the same card.
  const reviewedSet = useMemo(
    () => new Set<string>([...approvedSet, ...needsWorkSet]),
    [approvedSet, needsWorkSet],
  );
  const firstPending = activeSections.find((s) => !reviewedSet.has(s)) ?? null;

  // Commercial/unknown fonts still need uploading — Google Fonts are auto-
  // loaded, and Adobe Fonts with a configured kit id preview fine via Typekit.
  const missingFonts = (styleguide.fonts ?? []).filter(
    (f) =>
      f.source === "DETECTED" &&
      !f.fileUrl &&
      (f.availability === "COMMERCIAL" ||
        f.availability === "UNKNOWN" ||
        (f.availability === "ADOBE_FONTS" && !f.adobeFontsKitId)),
  );

  const { setActiveTab, setActiveComponentType, setIsEditing, openFontUpload } = useBrandstyleStore();
  const finalizeMut = useFinalizeReview();

  const handleCloseReview = () => {
    const confirmed = window.confirm(
      "Close the review and clear all approval / needs-work flags? This cannot be undone.",
    );
    if (!confirmed) return;
    finalizeMut.mutate();
  };

  const handleUploadFonts = () => {
    setActiveTab("brand_assets");
    openFontUpload();
  };

  const handleContinue = () => {
    if (!firstPending) return;
    setActiveTab(tabForSection(firstPending));

    // Enable edit mode: the approve / needs-work buttons on each
    // review panel are hidden behind the same `canEdit` gate as inline
    // token editing (sections compute `canEdit = !locked && isEditing`).
    // Clicking "Continue review" is an explicit intent to take action,
    // so we flip edit mode on for the user — otherwise they'd land on
    // the section with no visible controls.
    if (canEdit) setIsEditing(true);

    // Components tab has 7 internal sub-tabs and only renders the panel
    // for the currently selected sub-tab. Auto-select the matching one
    // so the scroll target actually exists in the DOM.
    const componentsSubTab = componentSectionToTypeKey(firstPending);
    if (componentsSubTab) setActiveComponentType(componentsSubTab);

    // Tab content is rendered in the next tick. Wait a frame, then scroll
    // the actual review panel for this section into view and briefly ring it
    // so the user sees where they landed (critical when the target tab is
    // already active — otherwise nothing visually changes).
    setTimeout(() => {
      const el = document.querySelector(
        `[data-testid="review-panel-${firstPending}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-emerald-400", "rounded-md", "transition");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-emerald-400", "rounded-md", "transition");
      }, 1800);
    }, 150);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Review draft design system</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {reviewCount === 0
              ? "Everything approved — styleguide is ready to publish."
              : firstPending == null
                ? `Every section reviewed. ${approved} approved · ${total - approved} flagged as needs work — publish to finalize.`
                : `${approved} of ${total} sections approved.`}
          </p>

          {/* Progress bar — inline background-color so Tailwind 4 purge
              doesn't strip emerald-500 when it's only used here. */}
          <div
            className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"
            data-review-progress
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progressPct}%`, backgroundColor: "#10b981" }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 flex-shrink-0">
          {firstPending && canEdit && (
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#0d9488" }}
            >
              Continue review
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={handleCloseReview}
              disabled={finalizeMut.isPending}
              title="Close review — clears all approval / needs-work flags and hides this card"
              aria-label="Close review"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Missing brand fonts warning — only shown for upload-required fonts. */}
      {missingFonts.length > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-medium">
                {missingFonts.length} commercial font{missingFonts.length === 1 ? "" : "s"} missing.
              </span>{" "}
              Upload the files for accurate previews, PDF exports and AI-generated content.
              Open-source fonts are auto-loaded from Google Fonts.
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

      {/* Grouped progress — one row per tab with a status summary + click-through */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {GROUPS.map((group) => {
          const applicable = group.sections.filter((s) => activeSet.has(s));
          if (applicable.length === 0) return null;
          const approvedInGroup = applicable.filter((s) => approvedSet.has(s)).length;
          const needsWorkInGroup = applicable.filter((s) => needsWorkSet.has(s)).length;
          const allDone = approvedInGroup === applicable.length;
          const hasNeedsWork = needsWorkInGroup > 0;

          return (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveTab(group.tab)}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-left rounded-lg border transition-colors ${
                allDone
                  ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                  : hasNeedsWork
                    ? "border-red-200 bg-red-50 hover:bg-red-100"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{group.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {approvedInGroup}/{applicable.length} approved
                  {hasNeedsWork && (
                    <span className="ml-1 text-red-600">
                      · {needsWorkInGroup} needs work
                    </span>
                  )}
                </p>
              </div>
              {allDone ? (
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Inline "needs work" summary — subtle, only rendered when there are blockers */}
      {needsWorkSet.size > 0 && (
        <p className="text-xs text-red-700">
          <span className="font-semibold">Needs work:</span>{" "}
          {Array.from(needsWorkSet)
            .map((s) => REVIEW_SECTION_LABELS[s as ReviewSectionKey] ?? s)
            .join(", ")}
        </p>
      )}
    </div>
  );
}
