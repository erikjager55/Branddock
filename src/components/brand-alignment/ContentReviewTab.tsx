"use client";

import { useState } from "react";
import { FileSearch, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/shared";
import {
  useSubmitReview,
  useReviewFindings,
  type ReviewSubmitInput,
} from "@/hooks/useReviewContent";
import { useInternalFindings } from "@/hooks/useInternalFindings";
import { useBrandAlignmentStore } from "@/stores/useBrandAlignmentStore";
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

  // Δ-1 deep-link preload — wanneer Surface D ReviewFindingsCard of Surface E
  // FindingsBlock een review aanwijst, opent dit tab direct met die specifieke
  // review pre-loaded i.p.v. het paste/url input-form. Mutually exclusive: of
  // een externe (reviewLogId) of een interne (fidelityScoreId), nooit beide.
  const preloadReviewLogId = useBrandAlignmentStore((s) => s.preloadReviewLogId);
  const preloadFidelityScoreId = useBrandAlignmentStore(
    (s) => s.preloadFidelityScoreId,
  );
  const clearPreload = useBrandAlignmentStore((s) => s.clearPreload);

  const submitMutation = useSubmitReview();
  // Voorrang: preloadReviewLogId > submit-result. Als gebruiker daarna "New
  // review" klikt, clearPreload() wordt geroepen en submit-result-pad neemt
  // het over.
  const externalReviewLogId =
    preloadReviewLogId ?? submitMutation.data?.reviewLogId ?? null;
  const findingsQuery = useReviewFindings(externalReviewLogId);
  const internalFindingsQuery = useInternalFindings(preloadFidelityScoreId);

  const isSubmitting = submitMutation.isPending || findingsQuery.isFetching;
  // Beide bounds op de getrimde content — anders ziet de user "55 / 50000"
  // groen terwijl submit alleen 50 chars stuurt. Trim ook bij submit.
  const trimmedPasteLen = pasteContent.trim().length;
  const canSubmit = mode === "paste"
    ? trimmedPasteLen >= PASTE_MIN_CHARS && trimmedPasteLen <= PASTE_MAX_CHARS
    : isLikelyUrl(urlValue.trim());

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    // Clear preload-state vóór submit zodat een fresh review ALTIJD voorrang
    // krijgt boven een eerder via deep-link geladen review. Zonder deze clear
    // bleef `externalReviewLogId = preloadReviewLogId ?? submitMutation.data...`
    // de preload tonen i.p.v. het nieuwe submit-resultaat.
    clearPreload();
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
    // Clear preload-state ook zodat "New review" altijd terug naar input-form
    // gaat, ook als de tab via deep-link werd geopend.
    clearPreload();
  };

  // Geen cleanup-on-unmount: BrandAlignmentPage rendert dit component
  // conditioneel via `{activeTab === 'review' && <ContentReviewTab />}`,
  // dus elke tab-switch (Tab 1↔Tab 3) zou de preload wissen — gebruiker
  // verliest dan de context wanneer hij even naar Alignment kijkt en
  // terugkomt. handleSubmit + handleReset dekken de paden waar preload
  // moet weg; cross-section-nav-en-terug behoudt de preload (volgende
  // deep-link click overschrijft hem alsnog).

  // Render-tree: input → loading → result. Showresult wanneer er
  // pre-loaded data is OF een afgeronde mutation. Collapse input wanneer
  // result tonen is — hergebruiken van scrolling-real-estate.
  const hasPreloadExternal =
    !!preloadReviewLogId && (findingsQuery.data || findingsQuery.isFetching);
  const hasPreloadInternal =
    !!preloadFidelityScoreId &&
    (internalFindingsQuery.data || internalFindingsQuery.isFetching);
  const showResult =
    hasPreloadExternal ||
    hasPreloadInternal ||
    (!!submitMutation.data && !submitMutation.isPending);

  // Bouw een synthetisch ReviewSubmitResponse-shape voor pre-loaded reviews
  // zodat ContentReviewResult dezelfde score-panel kan renderen als bij een
  // normaal submit-flow. `durationMs` is niet beschikbaar voor preload-internal
  // (score kan dagen oud zijn) — we laten het veld `undefined`; ScorePanel
  // rendert de "run took Xs" regel conditioneel pas vanaf > 0.
  const resolvedSubmitData = preloadReviewLogId && findingsQuery.data
    ? {
        reviewLogId: findingsQuery.data.reviewLogId,
        compositeScore: findingsQuery.data.compositeScore,
        thresholdMet: findingsQuery.data.thresholdMet,
        findingsCount: findingsQuery.data.findingsCount,
        durationMs: findingsQuery.data.durationMs,
        scorerVersion: findingsQuery.data.scorerVersion,
      }
    : preloadFidelityScoreId && internalFindingsQuery.data
      ? {
          // Internal-content reviews hebben geen reviewLogId — gebruik
          // fidelityScoreId als pseudo-id voor render. ContentReviewResult
          // leest het veld niet voor logica, alleen voor display.
          reviewLogId: internalFindingsQuery.data.fidelityScoreId,
          compositeScore: internalFindingsQuery.data.compositeScore,
          thresholdMet: internalFindingsQuery.data.thresholdMet,
          findingsCount: internalFindingsQuery.data.findingsCount,
          // durationMs ontbreekt voor preload-internal — score kan dagen oud
          // zijn. UI rendert die regel conditioneel pas vanaf > 0.
          durationMs: undefined,
          scorerVersion: internalFindingsQuery.data.scorerVersion,
        }
      : submitMutation.data;

  const resolvedFindings = preloadReviewLogId
    ? findingsQuery.data?.findings ?? []
    : preloadFidelityScoreId
      ? internalFindingsQuery.data?.findings ?? []
      : findingsQuery.data?.findings ?? [];

  const resolvedFindingsLoading = preloadReviewLogId
    ? findingsQuery.isPending
    : preloadFidelityScoreId
      ? internalFindingsQuery.isPending
      : findingsQuery.isPending;

  const resolvedFindingsError = preloadReviewLogId
    ? findingsQuery.error instanceof Error ? findingsQuery.error.message : null
    : preloadFidelityScoreId
      ? internalFindingsQuery.error instanceof Error
        ? internalFindingsQuery.error.message
        : null
      : findingsQuery.error instanceof Error ? findingsQuery.error.message : null;

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

      {showResult && resolvedSubmitData && (
        <>
          <ContentReviewResult
            submitData={resolvedSubmitData}
            findings={resolvedFindings}
            findingsLoading={resolvedFindingsLoading}
            findingsError={resolvedFindingsError}
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
  // ziet user "55 / 50000" groen terwijl submit met 50 chars naar server
  // gaat. Edge case: whitespace-only edits aan de boundary (50→52 spaties
  // toevoegen) updaten de counter niet — bewust, want trim is de
  // source-of-truth. Functioneel correct.
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
