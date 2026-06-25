"use client";

import { useMemo } from "react";
import { AlertTriangle, Lightbulb, Eye, CheckCircle2, ArrowRight, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared";
import {
  buildBrandstyleCalibrationReport,
  type CalibrationSeverity,
  type CalibrationSection,
} from "@/lib/brandstyle/calibration-report";
import type { BrandStyleguide, StyleguideTab } from "../types/brandstyle.types";

interface BrandstyleCalibrationPanelProps {
  styleguide: BrandStyleguide;
  /** Deep-link callback — switches the active styleguide tab (same pattern as the onboarding wizard). */
  onJumpToTab: (tab: StyleguideTab) => void;
}

/** Per-severity icon + accent classes. Classes verified present in compiled index.css (Tailwind 4 purge). */
const SEVERITY_META: Record<
  CalibrationSeverity,
  { icon: LucideIcon; rank: number; iconClass: string; chipClass: string }
> = {
  critical: { icon: AlertTriangle, rank: 0, iconClass: "text-red-600", chipClass: "bg-red-50 border-red-200 text-red-700" },
  suggestion: { icon: Lightbulb, rank: 1, iconClass: "text-amber-600", chipClass: "bg-amber-50 border-amber-200 text-amber-700" },
  review: { icon: Eye, rank: 2, iconClass: "text-blue-600", chipClass: "bg-blue-50 border-blue-200 text-blue-700" },
};

/** Maps an ask's section to the styleguide tab the deep-link should open. */
const SECTION_TAB: Record<CalibrationSection, { tab: StyleguideTab; label: string }> = {
  logo: { tab: "brand_assets", label: "Logos" },
  colors: { tab: "colors", label: "Colors" },
  typography: { tab: "typography", label: "Typography" },
  imagery: { tab: "imagery", label: "Imagery" },
  "design-language": { tab: "visual_system", label: "Visual System" },
};

/**
 * Consolidated "what needs attention" panel for an extracted styleguide.
 * Computes the calibration report client-side from already-loaded data
 * (no extra fetch) and surfaces low-confidence / missing / inferred items
 * as actionable asks with deep-links to the relevant tab.
 */
export function BrandstyleCalibrationPanel({ styleguide, onJumpToTab }: BrandstyleCalibrationPanelProps) {
  // Calibration only makes sense once extraction has finished — computing for a
  // DRAFT/ANALYZING styleguide would surface alarming "missing" asks over partial
  // data. Gate inside the memo so the hook always runs (Rules of Hooks) and the
  // gate ordering can't regress.
  const report = useMemo(
    () =>
      styleguide.status === "COMPLETE"
        ? buildBrandstyleCalibrationReport({
            colors: styleguide.colors.map((c) => ({ confidence: c.confidence, category: c.category })),
            fonts: styleguide.fonts.map((f) => ({ source: f.source, availability: f.availability, fileUrl: f.fileUrl })),
            logos: styleguide.logos.map((l) => ({ variant: l.variant })),
            guidelines: [...styleguide.photographyGuidelines, ...styleguide.illustrationGuidelines],
            typeScaleCount: styleguide.typeScale?.length ?? 0,
          })
        : null,
    [styleguide],
  );

  if (!report) return null;

  if (report.clean) {
    return (
      <div
        data-testid="brandstyle-calibration-panel"
        className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-700">
          Calibration complete — no open items in the extracted styleguide.
        </span>
      </div>
    );
  }

  const sortedAsks = [...report.asks].sort(
    (a, b) => SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank,
  );

  const summary = [
    report.counts.critical > 0 ? `${report.counts.critical} critical` : null,
    report.counts.suggestion > 0 ? `${report.counts.suggestion} to fix` : null,
    report.counts.review > 0 ? `${report.counts.review} to review` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div data-testid="brandstyle-calibration-panel" className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Calibration</h3>
        <span className="text-xs text-gray-500">{summary}</span>
      </div>

      <ul className="space-y-2">
        {sortedAsks.map((ask) => {
          const meta = SEVERITY_META[ask.severity];
          const target = SECTION_TAB[ask.section];
          const Icon = meta.icon;
          return (
            <li
              key={ask.id}
              data-testid={`calibration-ask-${ask.id}`}
              className="flex items-start gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <Icon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{ask.title}</span>
                  <span className={`rounded-full border px-2 py-1 text-xs font-medium uppercase tracking-wide ${meta.chipClass}`}>
                    {ask.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{ask.detail}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onJumpToTab(target.tab)}>
                {target.label}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
