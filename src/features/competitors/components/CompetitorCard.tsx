"use client";

import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/shared";
import { CardLockIndicator } from "@/components/lock";
import { TIER_BADGES, getScoreColor, getScoreLabel } from "../constants/competitor-constants";
import type { CompetitorWithMeta } from "../types/competitor.types";

interface CompetitorCardProps {
  competitor: CompetitorWithMeta;
  onClick: () => void;
}

/** Bridge getScoreLabel()'s English return value to a stable i18n key. */
const SCORE_LABEL_KEYS: Record<string, string> = {
  "Not scored": "notScored",
  "High threat": "highThreat",
  Moderate: "moderate",
  "Low threat": "lowThreat",
};

/** Competitor card for overview grid */
export function CompetitorCard({ competitor, onClick }: CompetitorCardProps) {
  const { t } = useTranslation("trends-personas-registry");
  const tierConfig = TIER_BADGES[competitor.tier];
  const visibleDifferentiators = competitor.differentiators.slice(0, 3);
  const remainingCount = Math.max(0, competitor.differentiators.length - 3);
  const hasScore = competitor.competitiveScore != null;
  const scoreLabel = getScoreLabel(competitor.competitiveScore ?? null);

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative flex flex-col rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardLockIndicator isLocked={competitor.isLocked} className="absolute top-3 right-3" />

      {/* Header: logo + name + tier */}
      <div className="flex items-center gap-3">
        {competitor.logoUrl ? (
          <img
            src={competitor.logoUrl}
            alt={competitor.name}
            className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Building2 className="h-5 w-5 text-gray-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {competitor.name}
            </h3>
            {tierConfig && (
              <Badge variant={tierConfig.variant} className="flex-shrink-0">
                {t(`trends-personas-registry:competitorTier.${competitor.tier}`, { defaultValue: tierConfig.label })}
              </Badge>
            )}
          </div>
          {competitor.tagline && (
            <p className="text-sm text-gray-500 truncate">
              {competitor.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {competitor.description && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          {competitor.description}
        </p>
      )}

      {/* Spacer to push bottom content down */}
      <div className="flex-1" />

      {/* Bottom: score + differentiator tags */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          {hasScore && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${getScoreColor(competitor.competitiveScore!)}`}>
              {competitor.competitiveScore}/100
              <span className="font-normal text-gray-400">
                {t(`trends-personas-registry:competitorScore.${SCORE_LABEL_KEYS[scoreLabel] ?? "notScored"}`, { defaultValue: scoreLabel })}
              </span>
            </span>
          )}
          {hasScore && visibleDifferentiators.length > 0 && (
            <span className="text-gray-200">|</span>
          )}
          {visibleDifferentiators.map((d) => (
            <span
              key={d}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {d}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-gray-400">
              +{remainingCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
