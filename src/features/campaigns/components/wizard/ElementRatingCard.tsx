"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { useCampaignWizardStore } from "../../stores/useCampaignWizardStore";

// ─── Types ──────────────────────────────────────────────

interface ElementRatingCardProps {
  label: string;
  value: string;
  ratingKey: string;
  /** Optional icon to show before the label */
  icon?: React.ElementType;
  /** Render value in a highlighted box (e.g. for insights, big ideas) */
  highlighted?: boolean;
  /** Custom background color class for highlighted box */
  highlightBg?: string;
}

// ─── Component ──────────────────────────────────────────

export function ElementRatingCard({
  label,
  value,
  ratingKey,
  icon: Icon,
  highlighted = false,
  highlightBg = "bg-gray-50",
}: ElementRatingCardProps) {
  const entry = useCampaignWizardStore((s) => s.strategyRatings[ratingKey]);
  const setRating = useCampaignWizardStore((s) => s.setStrategyRating);
  const setComment = useCampaignWizardStore((s) => s.setStrategyRatingComment);
  const rating = entry?.rating ?? null;
  const comment = entry?.comment ?? "";

  const [showComment, setShowComment] = useState(!!comment);

  const handleRating = (newRating: "up" | "down") => {
    const isDeselecting = rating === newRating;
    setRating(ratingKey, isDeselecting ? null : newRating);
    if (isDeselecting) {
      setShowComment(false);
    } else if (newRating === "down") {
      // Auto-expand comment field when rating "down"
      setShowComment(true);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Label + rating buttons */}
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <span className="inline-flex items-center gap-1 ml-auto flex-shrink-0">
          <button
            type="button"
            aria-pressed={rating === "up"}
            onClick={() => handleRating("up")}
            className={`px-1.5 py-1 rounded-md border transition-colors ${
              rating === "up"
                ? "bg-emerald-100 border-emerald-300 text-emerald-600"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:text-emerald-500 hover:border-emerald-200"
            }`}
            title="Approve"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-pressed={rating === "down"}
            onClick={() => handleRating("down")}
            className={`px-1.5 py-1 rounded-md border transition-colors ${
              rating === "down"
                ? "bg-red-100 border-red-300 text-red-500"
                : "bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200"
            }`}
            title="Needs change"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
          {/* Comment toggle — only show when rated */}
          {rating && (
            <button
              type="button"
              onClick={() => setShowComment(!showComment)}
              className={`px-1.5 py-1 rounded-md border transition-colors ${
                comment
                  ? "bg-blue-50 border-blue-200 text-blue-500"
                  : "bg-gray-50 border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200"
              }`}
              title={showComment ? "Hide comment" : "Add comment"}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
        </span>
      </div>

      {/* Value display */}
      {highlighted ? (
        <div className={`p-2.5 rounded-lg border border-gray-100 ${highlightBg}`}>
          <p className="text-sm text-gray-800">{value}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-800">{value}</p>
      )}

      {/* Expandable comment field */}
      {showComment && rating && (
        <textarea
          value={comment}
          onChange={(e) => setComment(ratingKey, e.target.value)}
          placeholder={
            rating === "down"
              ? "What should change and why?"
              : "Optional: any notes for the AI..."
          }
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          rows={2}
        />
      )}
    </div>
  );
}
