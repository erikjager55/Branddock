"use client";

import React from "react";
import { Star, TrendingUp, Tag } from "lucide-react";
import { BUNDLE_BADGES } from "../../constants/research-constants";

// ─── Types ───────────────────────────────────────────────────

interface BundleBadgeProps {
  type: "recommended" | "popular" | "save";
  discount?: number;
}

// ─── Icon mapping ────────────────────────────────────────────

const BADGE_ICONS = {
  recommended: Star,
  popular: TrendingUp,
  save: Tag,
} as const;

// ─── Component ───────────────────────────────────────────────

export function BundleBadge({ type, discount }: BundleBadgeProps) {
  const Icon = BADGE_ICONS[type];

  let bg: string;
  let text: string;
  let label: string;

  if (type === "save") {
    bg = "bg-blue-100";
    text = "text-blue-700";
    label = discount ? `Save ${discount}%` : "Save";
  } else {
    const config = BUNDLE_BADGES[type];
    bg = config.bg;
    text = config.text;
    label = config.label;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
