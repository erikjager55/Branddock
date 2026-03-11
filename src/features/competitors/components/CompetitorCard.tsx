"use client";

import { ChevronRight, Building2 } from "lucide-react";
import { Badge } from "@/components/shared";
import { CardLockIndicator } from "@/components/lock";
import { TIER_BADGES, getScoreColor, getScoreBgColor, getScoreLabel } from "../constants/competitor-constants";
import type { CompetitorWithMeta } from "../types/competitor.types";

interface CompetitorCardProps {
  competitor: CompetitorWithMeta;
  onClick: () => void;
}

/** Competitor card for overview grid */
export function CompetitorCard({ competitor, onClick }: CompetitorCardProps) {
  const tierConfig = TIER_BADGES[competitor.tier];
  const visibleDifferentiators = competitor.differentiators.slice(0, 3);
  const remainingCount = Math.max(0, competitor.differentiators.length - 3);

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardLockIndicator isLocked={competitor.isLocked} className="absolute top-3 right-3" />

      <div className="flex-1 min-w-0">
        {/* Top row: icon + name + tier badge */}
        <div className="flex items-center gap-3 mb-2">
          {competitor.logoUrl ? (
            <img
              src={competitor.logoUrl}
              alt={competitor.name}
              className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
              <Building2 className="h-5 w-5 text-red-600" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {competitor.name}
              </h3>
              {tierConfig && (
                <Badge variant={tierConfig.variant} className="flex-shrink-0">
                  {tierConfig.label}
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
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {competitor.description}
          </p>
        )}

        {/* Bottom row: score + differentiator tags */}
        <div className="flex items-center gap-3">
          {/* Competitive score */}
          {competitor.competitiveScore !== null && (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getScoreBgColor(competitor.competitiveScore)} ${getScoreColor(competitor.competitiveScore)}`}>
              {competitor.competitiveScore}/100
              <span className="text-[10px] opacity-70">
                {getScoreLabel(competitor.competitiveScore)}
              </span>
            </div>
          )}

          {/* Differentiator tags */}
          {visibleDifferentiators.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleDifferentiators.map((d, idx) => (
                <span
                  key={idx}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {d}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-gray-400">
                  +{remainingCount} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 mt-3" />
    </div>
  );
}
