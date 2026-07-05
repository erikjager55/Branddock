"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Ruler, Square } from "lucide-react";
import { Card } from "@/components/shared";
import { parseSemanticTokens } from "../utils/semantic-tokens";
import type { BrandStyleguide } from "../types/brandstyle.types";

interface Props {
  styleguide: BrandStyleguide;
}

const ROUNDED_ORDER = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const;
const SPACING_ORDER = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const ELEVATION_ORDER = ['1', '2', '3', '4', '5'] as const;

export function SystemScalesSection({ styleguide }: Props) {
  const { t } = useTranslation("brandstyle");
  const tokens = useMemo(
    () => parseSemanticTokens(styleguide.semanticTokens),
    [styleguide.semanticTokens],
  );

  if (!tokens) return null;
  const { rounded, spacing, elevation } = tokens.resolved;

  const hasAny =
    Object.keys(rounded ?? {}).length > 0 ||
    Object.keys(spacing ?? {}).length > 0 ||
    Object.keys(elevation ?? {}).length > 0;
  if (!hasAny) return null;

  return (
    <Card>
      <div className="flex items-start gap-3 mb-4">
        <Layers className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t("systemScales.title")}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("systemScales.subtitle")}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <RoundedScaleStrip rounded={rounded ?? {}} />
        <SpacingScaleStrip spacing={spacing ?? {}} />
        <ElevationStrip elevation={elevation ?? {}} />
      </div>
    </Card>
  );
}

function RoundedScaleStrip({ rounded }: { rounded: Record<string, number> }) {
  const { t } = useTranslation("brandstyle");
  const entries = ROUNDED_ORDER.filter((k) => rounded[k] !== undefined);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Square className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-700">{t("systemScales.rounded")}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {entries.map((k) => {
          const px = rounded[k]!;
          const radiusPx = k === 'full' || px >= 9999 ? 9999 : px;
          return (
            <div key={k} className="flex flex-col items-center gap-1.5">
              <div
                className="w-14 h-14 bg-teal-500 border border-teal-600"
                style={{ borderRadius: `${radiusPx}px` }}
              />
              <div className="text-center">
                <div className="font-mono text-[11px] text-gray-700">{k}</div>
                <div className="font-mono text-[10px] text-gray-400">
                  {radiusPx === 9999 ? 'full' : `${px}px`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpacingScaleStrip({ spacing }: { spacing: Record<string, number> }) {
  const { t } = useTranslation("brandstyle");
  const entries = SPACING_ORDER.filter((k) => spacing[k] !== undefined);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Ruler className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-700">{t("systemScales.spacing")}</span>
      </div>
      <div className="flex items-end gap-3">
        {entries.map((k) => {
          const px = spacing[k]!;
          return (
            <div key={k} className="flex flex-col items-center gap-1.5">
              <div
                className="bg-teal-500 rounded"
                style={{ width: `${px}px`, height: `${px}px`, minWidth: '8px', minHeight: '8px' }}
              />
              <div className="text-center">
                <div className="font-mono text-[11px] text-gray-700">{k}</div>
                <div className="font-mono text-[10px] text-gray-400">{px}px</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ElevationStrip({ elevation }: { elevation: Record<string, string> }) {
  const { t } = useTranslation("brandstyle");
  const entries = ELEVATION_ORDER.filter((k) => elevation[k]);
  if (entries.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-700">{t("systemScales.elevation")}</span>
        </div>
        <p className="text-xs text-gray-500 italic">
          {t("systemScales.elevationEmpty")}
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-700">{t("systemScales.elevation")}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {entries.map((level) => (
          <div key={level} className="flex flex-col items-center gap-2">
            <div
              className="w-16 h-16 bg-white rounded-lg"
              style={{ boxShadow: elevation[level] }}
            />
            <div className="text-center">
              <div className="font-mono text-[11px] text-gray-700">{t("systemScales.level", { level })}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
