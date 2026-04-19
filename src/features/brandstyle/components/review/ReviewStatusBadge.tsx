"use client";

import type { ReviewStatus } from "../../types/brandstyle.types";

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  size?: "sm" | "md";
}

const STYLES: Record<ReviewStatus, { dot: string; label: string; text: string; bg: string }> = {
  PENDING: {
    dot: "bg-gray-300",
    label: "Needs review",
    text: "text-gray-600",
    bg: "bg-gray-100",
  },
  APPROVED: {
    dot: "bg-emerald-500",
    label: "Approved",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  NEEDS_WORK: {
    dot: "bg-red-500",
    label: "Needs work",
    text: "text-red-700",
    bg: "bg-red-50",
  },
};

export function ReviewStatusBadge({ status, size = "md" }: ReviewStatusBadgeProps) {
  const s = STYLES[status];
  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClass} ${s.text} ${s.bg}`}
    >
      <span className={`inline-block rounded-full ${dotSize} ${s.dot}`} />
      {s.label}
    </span>
  );
}
