"use client";

import { Card } from "@/components/shared";
import type { BrandStyleguide } from "../types/brandstyle.types";
import { ReviewDraftPanel } from "./review/ReviewDraftPanel";

interface SpacingSectionProps {
  styleguide: BrandStyleguide;
  canEdit: boolean;
}

// Token shapes mirror buildSpacingTokens() in src/lib/brandstyle/css-visual-heuristics.ts
interface ScaleToken {
  name: string;
  value: number;
}
interface RadiusToken {
  name: string;
  value: number;
}
interface ShadowToken {
  name: string;
  value: string;
  intensity: "subtle" | "medium" | "bold";
}

interface SpacingScaleData {
  gridBase: number | null;
  tokens: ScaleToken[];
}
interface CornerRadiiData {
  tokens: RadiusToken[];
}
interface ShadowSystemData {
  tokens: ShadowToken[];
}

export function SpacingSection({ styleguide, canEdit }: SpacingSectionProps) {
  const reviews = styleguide.reviews ?? [];

  const spacingScale =
    (styleguide as unknown as { spacingScale?: SpacingScaleData }).spacingScale ?? {
      gridBase: null,
      tokens: [],
    };
  const cornerRadii =
    (styleguide as unknown as { cornerRadii?: CornerRadiiData }).cornerRadii ?? {
      tokens: [],
    };
  const shadowSystem =
    (styleguide as unknown as { shadowSystem?: ShadowSystemData }).shadowSystem ?? {
      tokens: [],
    };

  return (
    <div data-testid="spacing-section" className="space-y-6">
      {/* Spacing scale */}
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Spacing scale</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {spacingScale.gridBase
              ? `Detected ${spacingScale.gridBase}px grid base. `
              : ""}
            Vertical rhythm and component padding derived from most-used spacing values.
          </p>
        </div>
        {spacingScale.tokens.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            No spacing tokens detected yet. Run an analysis on a CSS-rich site to populate.
          </p>
        ) : (
          <div className="space-y-2">
            {spacingScale.tokens.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.name}
                </span>
                <div
                  className="h-5 bg-emerald-400 rounded-sm"
                  style={{ width: `${Math.min(t.value * 2, 300)}px` }}
                  title={`${t.value}px`}
                />
                <span className="text-xs text-gray-500 font-mono">{t.value}px</span>
              </div>
            ))}
          </div>
        )}
        <ReviewDraftPanel
          section="spacing-scale"
          reviews={reviews}
          canEdit={canEdit}
          label="Review spacing scale"
        />
      </Card>

      {/* Corner radii */}
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Corner radii</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            How sharp or soft shapes appear — buttons, cards, inputs.
          </p>
        </div>
        {cornerRadii.tokens.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            No corner radii detected yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {cornerRadii.tokens.map((t) => (
              <div key={t.name} className="flex flex-col items-center gap-1.5">
                <div
                  className="h-16 w-16 bg-emerald-50 border-2 border-emerald-400"
                  style={{ borderRadius: `${t.value}px` }}
                  title={`${t.value}px`}
                />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.name}
                </span>
                <span className="text-xs text-gray-400 font-mono">{t.value}px</span>
              </div>
            ))}
          </div>
        )}
        <ReviewDraftPanel
          section="spacing-radii"
          reviews={reviews}
          canEdit={canEdit}
          label="Review corner radii"
        />
      </Card>

      {/* Shadow system */}
      <Card>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Shadow system</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Depth and elevation — how cards, modals, and popovers layer above the canvas.
          </p>
        </div>
        {shadowSystem.tokens.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            No shadows detected yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shadowSystem.tokens.map((t) => (
              <div
                key={t.name + t.value}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-md"
              >
                <div
                  className="h-16 w-16 bg-white rounded-md"
                  style={{ boxShadow: t.value }}
                  title={t.value}
                />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.name}
                </span>
                <span className="text-[10px] text-gray-400 capitalize">{t.intensity}</span>
              </div>
            ))}
          </div>
        )}
        <ReviewDraftPanel
          section="spacing-shadow"
          reviews={reviews}
          canEdit={canEdit}
          label="Review shadow system"
        />
      </Card>
    </div>
  );
}
