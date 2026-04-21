"use client";

import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { ThumbsUp, ThumbsDown, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/shared";
import type { ReviewStatus, StyleguideReviewData } from "../../types/brandstyle.types";
import { useUpdateReview, useUploadReviewReference } from "../../hooks/useBrandstyleHooks";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

/** When true, every ReviewDraftPanel inside the tree renders null.
 *  BrandStyleguidePage wraps the tab content with this provider set to
 *  `styleguide.published`, so the "Close review" action instantly hides
 *  all thumbs / feedback UI without prop-drilling through 11 callsites. */
const ReviewClosedContext = createContext<boolean>(false);
export const ReviewClosedProvider = ReviewClosedContext.Provider;

interface ReviewDraftPanelProps {
  section: string;
  reviews: StyleguideReviewData[];
  canEdit: boolean;
  /** Optional preview label — defaults to the section key. */
  label?: string;
  /** When true, the panel renders nothing. Used after the review is
   *  finalized via the "Close review" action — the styleguide is done
   *  and thumbs/feedback UI becomes noise. */
  closed?: boolean;
}

export function ReviewDraftPanel({ section, reviews, canEdit, label, closed }: ReviewDraftPanelProps) {
  const contextClosed = useContext(ReviewClosedContext);
  if (closed || contextClosed) return null;
  const current = useMemo(
    () => reviews.find((r) => r.section === section) ?? null,
    [reviews, section],
  );
  const status: ReviewStatus = current?.status ?? "PENDING";

  const [feedback, setFeedback] = useState(current?.feedback ?? "");
  const [refImage, setRefImage] = useState<string | null>(current?.referenceImageUrl ?? null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep draft state in sync with the latest server data whenever the
  // feedback panel is NOT open. Re-renders triggered by other actions
  // (approve/refetch) shouldn't stomp the user's in-progress edits, but
  // they should refresh the displayed read-only values.
  useEffect(() => {
    if (showFeedback) return;
    setFeedback(current?.feedback ?? "");
    setRefImage(current?.referenceImageUrl ?? null);
  }, [current?.feedback, current?.referenceImageUrl, showFeedback]);

  const updateMut = useUpdateReview();
  const uploadMut = useUploadReviewReference();

  /** After a successful review action, scroll the user back to the
   *  progress indicator at the top so they see the bar advance + the
   *  "Continue review" button now points to the next section. */
  const scrollToProgress = () => {
    const el = document.querySelector("[data-review-progress]");
    if (!(el instanceof HTMLElement)) return;
    // Scroll with some offset above so the whole summary card is visible,
    // not just the thin progress bar.
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const applyStatus = (nextStatus: ReviewStatus) => {
    setError(null);
    if (nextStatus === "APPROVED") {
      updateMut.mutate(
        {
          section,
          body: {
            status: "APPROVED",
            feedback: null,
            referenceImageUrl: null,
          },
        },
        {
          onSuccess: () => {
            setFeedback("");
            setRefImage(null);
            setShowFeedback(false);
            scrollToProgress();
          },
          onError: (err) => setError(err instanceof Error ? err.message : "Failed to update"),
        },
      );
      return;
    }
    // NEEDS_WORK — open feedback UI; actual save happens on Submit
    setShowFeedback(true);
  };

  const submitNeedsWork = () => {
    setError(null);
    updateMut.mutate(
      {
        section,
        body: {
          status: "NEEDS_WORK",
          feedback: feedback.trim() || null,
          referenceImageUrl: refImage,
        },
      },
      {
        onSuccess: () => scrollToProgress(),
        onError: (err) => setError(err instanceof Error ? err.message : "Failed to update"),
      },
    );
  };

  const cancelNeedsWork = () => {
    setFeedback(current?.feedback ?? "");
    setRefImage(current?.referenceImageUrl ?? null);
    setShowFeedback(status === "NEEDS_WORK");
    setError(null);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large. Max 5MB.");
      return;
    }
    setError(null);
    uploadMut.mutate(
      { section, file },
      {
        onSuccess: (res) => setRefImage(res.url),
        onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
      },
    );
  };

  const headline = label ?? "Review this section";
  const isBusy = updateMut.isPending || uploadMut.isPending;

  return (
    <div className="mt-6 pt-4 border-t border-gray-100" data-testid={`review-panel-${section}`}>
      {/* Error surfaced here (not just inside the feedback form) so the
          user sees why "Looks good" silently didn't stick. */}
      {error && !showFeedback && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md"
        >
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate">
            {headline}
          </h4>
          <ReviewStatusBadge status={status} />
        </div>
        {canEdit && !showFeedback && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyStatus("APPROVED")}
              disabled={isBusy}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-pressed={status === "APPROVED"}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Looks good
            </button>
            <button
              type="button"
              onClick={() => applyStatus("NEEDS_WORK")}
              disabled={isBusy}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                status === "NEEDS_WORK"
                  ? "bg-red-100 text-red-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-pressed={status === "NEEDS_WORK"}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {status === "NEEDS_WORK" ? "Edit feedback" : "Needs work"}
            </button>
          </div>
        )}
      </div>

      {/* Read-only display when not editing + there is existing feedback.
          Shown as a card with a subtle "what happens to this feedback"
          hint so the reviewer knows it's not shouting into the void. */}
      {!showFeedback && status === "NEEDS_WORK" && (current?.feedback || current?.referenceImageUrl) && (
        <div className="bg-red-50/50 border border-red-100 rounded-md p-3 space-y-2">
          {current?.feedback && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{current.feedback}</p>
          )}
          {current?.referenceImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={current.referenceImageUrl}
              alt="Reference"
              className="max-h-40 rounded border border-red-200"
            />
          )}
          <div className="pt-2 border-t border-red-100 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-gray-500 leading-snug">
              Feedback is saved with this section and included when you re-run the AI analysis
              or export the styleguide.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => applyStatus("APPROVED")}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <ThumbsUp className="h-3 w-3" />
                Mark as approved
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty NEEDS_WORK with no feedback yet — show a nudge so the user
          knows to click "Edit feedback" to write what's wrong. */}
      {!showFeedback && status === "NEEDS_WORK" && !current?.feedback && !current?.referenceImageUrl && canEdit && (
        <div className="bg-red-50/50 border border-red-100 rounded-md p-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-red-700 flex-1 min-w-0">
            Marked as needs work. Click <strong>Edit feedback</strong> above to describe what
            should change — the note is reused when regenerating the section.
          </p>
          <button
            type="button"
            onClick={() => applyStatus("APPROVED")}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <ThumbsUp className="h-3 w-3" />
            Mark as approved
          </button>
        </div>
      )}

      {/* Feedback form */}
      {showFeedback && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what you'd prefer…"
            rows={3}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />

          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
              {uploadMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {refImage ? "Replace reference" : "Add reference image"}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={cancelNeedsWork} disabled={isBusy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={submitNeedsWork}
                isLoading={updateMut.isPending}
              >
                Submit
              </Button>
            </div>
          </div>

          {refImage && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={refImage}
                alt="Reference preview"
                className="max-h-32 rounded border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setRefImage(null)}
                className="absolute -top-1.5 -right-1.5 p-0.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
                aria-label="Remove reference image"
              >
                <X className="h-3 w-3 text-gray-500" />
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
