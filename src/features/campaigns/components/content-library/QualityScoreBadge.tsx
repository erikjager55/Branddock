"use client";

import React from "react";
import {
  getQualityColor,
  getQualityBgColor,
  getQualityLabel,
} from "../../lib/quality-colors";

// ─── Types ────────────────────────────────────────────────

interface QualityScoreBadgeProps {
  score: number | null;
  size?: "sm" | "lg";
}

// ─── Component ────────────────────────────────────────────

export function QualityScoreBadge({
  score,
  size = "sm",
}: QualityScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400">
        &mdash;
      </span>
    );
  }

  const textColor = getQualityColor(score);
  const bgColor = getQualityBgColor(score);
  const label = getQualityLabel(score);

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}
      >
        {score}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}
    >
      <span>{score}</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

export default QualityScoreBadge;
