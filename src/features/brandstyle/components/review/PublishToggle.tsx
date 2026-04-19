"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { StyleguideReviewData } from "../../types/brandstyle.types";
import { useSetPublished } from "../../hooks/useBrandstyleHooks";
import { ACTIVE_REVIEW_SECTIONS, REVIEW_SECTION_LABELS } from "@/lib/brandstyle/review-sections";

interface PublishToggleProps {
  published: boolean;
  reviews: StyleguideReviewData[];
  disabled?: boolean;
}

export function PublishToggle({ published, reviews, disabled }: PublishToggleProps) {
  const setPublishedMut = useSetPublished();
  const [error, setError] = useState<string | null>(null);

  const approvedSet = new Set(
    reviews.filter((r) => r.status === "APPROVED").map((r) => r.section),
  );
  const missing = ACTIVE_REVIEW_SECTIONS.filter((s) => !approvedSet.has(s));
  const canPublish = missing.length === 0;

  const handleToggle = (next: boolean) => {
    setError(null);
    // Unpublish is always allowed; publish only when no missing sections.
    if (next && !canPublish) return;
    setPublishedMut.mutate(next, {
      onError: (err) => setError(err instanceof Error ? err.message : "Failed to update"),
    });
  };

  const isDisabled = disabled || setPublishedMut.isPending || (!published && !canPublish);

  const tooltip = !canPublish && !published
    ? `${missing.length} section${missing.length === 1 ? "" : "s"} still need${
        missing.length === 1 ? "s" : ""
      } review: ${missing.map((s) => REVIEW_SECTION_LABELS[s]).join(", ")}`
    : undefined;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">Published</span>
        <button
          type="button"
          role="switch"
          aria-checked={published}
          aria-label="Toggle published"
          title={tooltip}
          onClick={() => handleToggle(!published)}
          disabled={isDisabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            published ? "bg-emerald-500" : "bg-gray-300"
          } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              published ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
          {setPublishedMut.isPending && (
            <Loader2 className="absolute -right-5 h-3.5 w-3.5 animate-spin text-gray-500" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
