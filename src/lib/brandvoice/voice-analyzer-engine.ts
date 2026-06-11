// =============================================================
// Voice Analyzer Engine
//
// Fire-and-forget orchestrator for brandvoice analysis runs. Mirrors the
// scanner-pipeline pattern: in-memory progress map keyed by jobId.
//
// Two input modes:
//   - URL-mode: scrape homepage + ~8 subpages via multi-page-scraper,
//     concatenate bodyText, send to Claude.
//   - Paste-mode: skip scraping, use the user-provided samples directly.
//
// Phases:
//   1. PENDING    →  job created
//   2. SCRAPING   →  multi-page scrape (URL-mode only)
//   3. EXTRACTING →  build corpus from scraped bodyText / pasted samples
//   4. ANALYZING  →  Claude structured-output call
//   5. COMPLETED  →  result stored in progress map for the polling endpoint
// =============================================================

import { scrapeUrlMultiPage } from "@/lib/brandstyle/multi-page-scraper";
import { scrapeUrl } from "@/lib/brandstyle/url-scraper";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { getBrandContext } from "@/lib/ai/brand-context";
import {
  buildVoiceAnalysisSystemPrompt,
  buildVoiceAnalysisUserPrompt,
} from "./voice-analysis-prompts";

import type {
  VoiceAnalysisStatus,
  VoiceAnalysisResult,
  VoiceAnalysisProgress,
} from "@/features/brandvoice/types/voiceguide.types";

// ─── In-memory progress store ───────────────────────────────

const progressMap = new Map<string, VoiceAnalysisProgress>();

export function getVoiceAnalysisProgress(jobId: string): VoiceAnalysisProgress | null {
  return progressMap.get(jobId) ?? null;
}

function setStatus(
  jobId: string,
  status: VoiceAnalysisStatus,
  patch: Partial<VoiceAnalysisProgress> = {},
) {
  const current = progressMap.get(jobId);
  if (!current) return;
  progressMap.set(jobId, { ...current, status, ...patch });
}

// ─── Cleanup: remove finished jobs after 30 minutes ─────────

setInterval(() => {
  const now = Date.now();
  for (const [id, p] of progressMap.entries()) {
    if (p.status === "COMPLETED" || p.status === "FAILED") {
      const completedAt = (p as { _completedAt?: number })._completedAt ?? now;
      if (now - completedAt > 30 * 60 * 1000) progressMap.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ─── Public start function ──────────────────────────────────

export interface StartVoiceAnalysisInput {
  jobId: string;
  workspaceId: string;
  brandName?: string | null;
  industry?: string | null;
  url?: string;
  pastedSamples?: string[];
}

/**
 * Initialize the progress entry. Call this BEFORE startVoiceAnalysisPipeline
 * so the polling endpoint always has a record to return.
 */
export function initVoiceAnalysisJob(jobId: string): void {
  progressMap.set(jobId, {
    jobId,
    status: "PENDING",
    progress: 0,
    currentStep: "Queued",
    errors: [],
    result: null,
  });
}

/**
 * Fire-and-forget — kicks off scraping + Claude analysis. Resolves once the
 * job is queued; the heavy work runs in the background and updates progressMap.
 */
export async function startVoiceAnalysisPipeline(input: StartVoiceAnalysisInput): Promise<void> {
  const { jobId } = input;

  // Async IIFE so we can return immediately
  void (async () => {
    try {
      setStatus(jobId, "SCRAPING", { progress: 10, currentStep: "Collecting source text" });

      let corpus = "";
      const sourceLabels: string[] = [];

      if (input.url) {
        try {
          const { merged, subpageUrls } = await scrapeUrlMultiPage(input.url);
          const homepageText = merged.bodyText ?? "";
          if (homepageText) {
            corpus += `[homepage]\n${homepageText}\n\n`;
            sourceLabels.push("homepage");
          }
          for (const sub of subpageUrls) {
            try {
              const sd = await scrapeUrl(sub);
              if (sd.bodyText && sd.bodyText.length > 100) {
                const label = sub.split("/").filter(Boolean).pop() ?? "subpage";
                corpus += `[${label}]\n${sd.bodyText}\n\n`;
                sourceLabels.push(label);
              }
            } catch {
              // Skip individual page failures; the merged base usually has enough.
            }
          }
        } catch (err) {
          // Single-page fallback if multi-page fails entirely.
          const sd = await scrapeUrl(input.url);
          corpus = sd.bodyText ?? "";
          sourceLabels.push("homepage");
          console.warn("[voice-analyzer] multi-page scrape failed, fell back to single page", err);
        }
      } else if (input.pastedSamples?.length) {
        corpus = input.pastedSamples.join("\n\n");
        sourceLabels.push("user-provided samples");
      } else {
        throw new Error("Either url or pastedSamples is required");
      }

      if (corpus.trim().length < 200) {
        throw new Error(
          "Not enough text to analyze (less than 200 characters). Provide a different URL or paste more samples.",
        );
      }

      setStatus(jobId, "EXTRACTING", { progress: 35, currentStep: "Preparing corpus for Claude" });

      // Descriptive output fields must follow the workspace content language
      // (what the Voice DNA tab shows). Resolution failure is non-critical:
      // fall back to the unguarded prompt rather than failing the whole job.
      let contentLanguage: string | undefined;
      try {
        contentLanguage = (await getBrandContext(input.workspaceId)).contentLanguage;
      } catch (langErr) {
        console.warn("[voice-analyzer] workspace language resolution failed, prompt has no locale guard", langErr);
      }

      const userPrompt = buildVoiceAnalysisUserPrompt({
        brandName: input.brandName ?? null,
        industry: input.industry ?? null,
        corpus,
        sourceLabels,
      });

      setStatus(jobId, "ANALYZING", { progress: 60, currentStep: "Claude analyzing voice" });

      const result = await createClaudeStructuredCompletion<VoiceAnalysisResult>(
        buildVoiceAnalysisSystemPrompt(contentLanguage),
        userPrompt,
        {
          temperature: 0.4,
          maxTokens: 6000,
          timeoutMs: 120_000,
        },
      );

      // Light shape sanitisation — never trust AI output blindly.
      // The Claude response uses plain strings per channel; wrap them in
      // ChannelToneEntry objects (description + null axisShift).
      const channelToneRaw = (result as { channelTones?: Record<string, unknown> }).channelTones ?? {};
      const channelTones: VoiceAnalysisResult["channelTones"] = {};
      for (const key of ["website", "socialMedia", "email", "ads", "video"] as const) {
        const v = channelToneRaw[key];
        if (typeof v === "string" && v.trim().length > 0) {
          channelTones[key] = { description: v.trim(), axisShift: null };
        }
      }

      const sanitized: VoiceAnalysisResult = {
        voiceDescription: typeof result.voiceDescription === "string" ? result.voiceDescription : "",
        toneDimensions: {
          formalCasual: clampInt(result.toneDimensions?.formalCasual, 1, 7, 4),
          seriousFunny: clampInt(result.toneDimensions?.seriousFunny, 1, 7, 4),
          respectfulIrreverent: clampInt(result.toneDimensions?.respectfulIrreverent, 1, 7, 4),
          matterOfFactEnthusiastic: clampInt(result.toneDimensions?.matterOfFactEnthusiastic, 1, 7, 4),
        },
        writingSamples: stringArray(result.writingSamples).slice(0, 6),
        wordsWeUse: stringArray(result.wordsWeUse).slice(0, 20),
        wordsWeAvoid: stringArray(result.wordsWeAvoid).slice(0, 20),
        channelTones,
        antiPatterns: stringArray(result.antiPatterns).slice(0, 12),
        rationale: result.rationale ?? {},
      };

      const completedAt = Date.now();
      progressMap.set(jobId, {
        jobId,
        status: "COMPLETED",
        progress: 100,
        currentStep: "Done",
        errors: [],
        result: sanitized,
        // mark internally for cleanup timer
        ...({ _completedAt: completedAt } as object),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const current = progressMap.get(jobId);
      progressMap.set(jobId, {
        ...(current ?? {
          jobId,
          status: "FAILED",
          progress: 0,
          currentStep: null,
          errors: [],
          result: null,
        }),
        status: "FAILED",
        currentStep: "Failed",
        errors: [...(current?.errors ?? []), message],
        ...({ _completedAt: Date.now() } as object),
      });
    }
  })();
}

// ─── Helpers ────────────────────────────────────────────────

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
