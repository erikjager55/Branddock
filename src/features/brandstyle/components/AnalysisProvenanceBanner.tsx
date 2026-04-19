"use client";

import { Sparkles, ShieldCheck, Info } from "lucide-react";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface AnalysisProvenanceBannerProps {
  styleguide: BrandStyleguide;
}

/** Human-readable framework names for the detector slugs we emit. */
const FRAMEWORK_LABELS: Record<string, string> = {
  acss: "AutomaticCSS",
  "tailwind-v4": "Tailwind v4",
  shadcn: "shadcn/ui",
  elementor: "Elementor",
  material: "Material Design",
  bootstrap: "Bootstrap",
  webflow: "Webflow",
};

function labelFor(name: string): string {
  return FRAMEWORK_LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Provenance banner shown at the top of the styleguide. Surfaces:
 *   - Which CSS framework / design-system the scraper recognised (if any)
 *   - How many extracted brand colors are high-confidence vs lower
 *
 * Stays out of the way when there's nothing meaningful to report
 * (no frameworks AND no color confidence data) — returns null.
 */
export function AnalysisProvenanceBanner({ styleguide }: AnalysisProvenanceBannerProps) {
  const frameworks = styleguide.detectedFrameworks ?? [];
  const colors = styleguide.colors ?? [];

  const high = colors.filter((c) => c.confidence === "high").length;
  const medium = colors.filter((c) => c.confidence === "medium").length;
  const low = colors.filter((c) => c.confidence === "low").length;
  const hasConfidenceData = high + medium + low > 0;

  // Nothing useful to show — likely a pre-fase-2 styleguide
  if (frameworks.length === 0 && !hasConfidenceData) return null;

  // Style intensity: high-confidence dominant → emerald, otherwise amber
  const isStrong = high >= 2;
  const styles = isStrong
    ? {
        wrap: "bg-emerald-50 border-emerald-200",
        icon: "text-emerald-600",
        label: "text-emerald-900",
        body: "text-emerald-800",
      }
    : hasConfidenceData && high === 0
      ? {
          wrap: "bg-amber-50 border-amber-200",
          icon: "text-amber-600",
          label: "text-amber-900",
          body: "text-amber-800",
        }
      : {
          wrap: "bg-blue-50 border-blue-200",
          icon: "text-blue-600",
          label: "text-blue-900",
          body: "text-blue-800",
        };

  const Icon = isStrong ? ShieldCheck : hasConfidenceData && high === 0 ? Info : Sparkles;

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${styles.wrap}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${styles.label}`}>
          {frameworks.length > 0
            ? `Detected: ${frameworks.map(labelFor).join(" + ")}`
            : "Brand tokens extracted"}
        </p>
        {hasConfidenceData && (
          <p className={`mt-0.5 text-xs ${styles.body}`}>
            <span className="font-mono font-semibold">{high}</span> high
            {" · "}
            <span className="font-mono font-semibold">{medium}</span> medium
            {" · "}
            <span className="font-mono font-semibold">{low}</span> low confidence color
            {colors.length === 1 ? "" : "s"}
            {high === 0 && (
              <span className="ml-1 italic">
                — no canonical brand-token signal found, results may be approximate
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
