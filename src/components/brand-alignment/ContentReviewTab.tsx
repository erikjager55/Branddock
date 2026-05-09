"use client";

import { useState } from "react";
import { FileSearch, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared";
import {
  useSubmitReview,
  useReviewFindings,
  type ReviewSubmitInput,
} from "@/hooks/useReviewContent";
import { ContentReviewResult } from "./ContentReviewResult";

const PASTE_MIN_CHARS = 50;
const PASTE_MAX_CHARS = 50_000;

type SourceMode = "paste" | "url";

/**
 * Δ-1 Surface C — Brand Alignment "Content Review" tab.
 * Paste-textarea OF URL-input, submit roept POST /api/alignment/review-external.
 * Bij success: GET /[reviewLogId] voor findings, render via ContentReviewResult.
 */
export function ContentReviewTab() {
  const [mode, setMode] = useState<SourceMode>("paste");
  const [pasteContent, setPasteContent] = useState("");
  const [urlValue, setUrlValue] = useState("");

  const submitMutation = useSubmitReview();
  const findingsQuery = useReviewFindings(submitMutation.data?.reviewLogId ?? null);

  const isSubmitting = submitMutation.isPending || findingsQuery.isFetching;
  // Beide bounds op de getrimde content — anders ziet de user "55 / 50000"
  // groen terwijl submit alleen 50 chars stuurt. Trim ook bij submit.
  const trimmedPasteLen = pasteContent.trim().length;
  const canSubmit = mode === "paste"
    ? trimmedPasteLen >= PASTE_MIN_CHARS && trimmedPasteLen <= PASTE_MAX_CHARS
    : isLikelyUrl(urlValue.trim());

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    // Trim ook bij submit — zelfde reden als hierboven.
    const input: ReviewSubmitInput =
      mode === "paste"
        ? { sourceType: "paste", content: pasteContent.trim() }
        : { sourceType: "url", url: urlValue.trim() };
    submitMutation.mutate(input);
  };

  const handleReset = () => {
    submitMutation.reset();
    setPasteContent("");
    setUrlValue("");
  };

  // Render-tree: input → loading → result. Collapse input wanneer result tonen
  // is — hergebruiken van scrolling-real-estate.
  const showResult = !!submitMutation.data && !submitMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <header className="flex items-center gap-3">
        <FileSearch className="w-6 h-6 text-emerald-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Content review</h2>
          <p className="text-sm text-gray-500">
            Plak een tekst of URL voor F-VAL fidelity-scoring met findings.
          </p>
        </div>
      </header>

      {!showResult && (
        <InputCard
          mode={mode}
          onModeChange={setMode}
          pasteContent={pasteContent}
          onPasteChange={setPasteContent}
          urlValue={urlValue}
          onUrlChange={setUrlValue}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          submitError={submitMutation.error instanceof Error ? submitMutation.error.message : null}
        />
      )}

      {showResult && submitMutation.data && (
        <>
          <ContentReviewResult
            submitData={submitMutation.data}
            findings={findingsQuery.data?.findings ?? []}
            findingsLoading={findingsQuery.isPending}
            findingsError={
              findingsQuery.error instanceof Error ? findingsQuery.error.message : null
            }
          />
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              New review
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Input card ───────────────────────────────────────

interface InputCardProps {
  mode: SourceMode;
  onModeChange: (m: SourceMode) => void;
  pasteContent: string;
  onPasteChange: (s: string) => void;
  urlValue: string;
  onUrlChange: (s: string) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  submitError: string | null;
}

function InputCard({
  mode,
  onModeChange,
  pasteContent,
  onPasteChange,
  urlValue,
  onUrlChange,
  canSubmit,
  isSubmitting,
  onSubmit,
  submitError,
}: InputCardProps) {
  // Counter toont getrimde lengte (zelfde basis als canSubmit) — anders
  // ziet user "55 / 50000" groen terwijl submit met 50 chars naar server gaat.
  const pasteLen = pasteContent.trim().length;
  const tooShort = mode === "paste" && pasteLen > 0 && pasteLen < PASTE_MIN_CHARS;
  const tooLong = mode === "paste" && pasteLen > PASTE_MAX_CHARS;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      {/* Plain aria-pressed toggle — geen volledig WAI-ARIA tab-pattern
          (zou roving tabindex + arrow-key handler + tabpanels vereisen).
          Een onvolledig tab-pattern misleidt SR-users meer dan plain
          buttons; consistent met PillButton-toggle elders. */}
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={mode === "paste"}
          onClick={() => onModeChange("paste")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === "paste"
              ? "bg-emerald-50 text-emerald-700 font-medium"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          aria-pressed={mode === "url"}
          onClick={() => onModeChange("url")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === "url"
              ? "bg-emerald-50 text-emerald-700 font-medium"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          URL
        </button>
      </div>

      {mode === "paste" ? (
        <div>
          <textarea
            value={pasteContent}
            onChange={(e) => onPasteChange(e.target.value)}
            placeholder={`Paste content here (min ${PASTE_MIN_CHARS} chars)...`}
            rows={10}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className={tooShort || tooLong ? "text-amber-600" : "text-gray-400"}>
              {pasteLen.toLocaleString()} / {PASTE_MAX_CHARS.toLocaleString()} chars
              {tooShort && ` — minimum ${PASTE_MIN_CHARS}`}
              {tooLong && " — too long"}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={urlValue}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://example.com/blog-post"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">
            Public URL only — private IPs and non-http(s) schemes are rejected server-side.
          </p>
        </div>
      )}

      {submitError && (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          icon={isSubmitting ? Loader2 : FileSearch}
        >
          {isSubmitting ? "Reviewing..." : "Review content"}
        </Button>
      </div>
    </div>
  );
}

// ─── Validation helpers ───────────────────────────────

function isLikelyUrl(value: string): boolean {
  if (value.length === 0) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
