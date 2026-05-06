"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2, Globe, AlignLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { useStartVoiceAnalyze, useVoiceAnalysisStatus } from "../hooks";
import { useVoiceguideStore } from "../stores/useVoiceguideStore";
import { VoiceAnalyzerProcessing } from "./analyzer/VoiceAnalyzerProcessing";
import { VoiceAnalyzerReview } from "./analyzer/VoiceAnalyzerReview";

interface BrandVoiceAnalyzerPageProps {
  onNavigateToGuide: () => void;
}

export function BrandVoiceAnalyzerPage({ onNavigateToGuide }: BrandVoiceAnalyzerPageProps) {
  const inputMode = useVoiceguideStore((s) => s.analyzerInputMode);
  const setInputMode = useVoiceguideStore((s) => s.setAnalyzerInputMode);
  const jobId = useVoiceguideStore((s) => s.analyzerJobId);
  const setJobId = useVoiceguideStore((s) => s.setAnalyzerJobId);

  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = useStartVoiceAnalyze();
  const { data: progress } = useVoiceAnalysisStatus(jobId);

  // Reset when mounted fresh
  useEffect(() => {
    return () => {
      // Don't clear jobId on unmount — store persists for resume on remount.
    };
  }, []);

  const handleStart = async () => {
    setError(null);
    try {
      const samples = pasted
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 30);
      const payload =
        inputMode === "url"
          ? { url: url.trim() }
          : { pastedSamples: samples };
      const res = await start.mutateAsync(payload);
      setJobId(res.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start analyzer");
    }
  };

  const phase = useMemo(() => {
    if (!jobId || !progress) return "idle";
    if (progress.status === "FAILED") return "failed";
    if (progress.status === "COMPLETED") return "review";
    return "processing";
  }, [jobId, progress]);

  const handleReset = () => {
    setJobId(null);
    setUrl("");
    setPasted("");
    setError(null);
  };

  return (
    <PageShell maxWidth="5xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onNavigateToGuide}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Brand Voice
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Voice Analyzer</h1>
            <p className="text-sm text-gray-500">
              Scrape long-form text and let Claude suggest tone, vocabulary, channel-tones and writing samples.
            </p>
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setInputMode("url")}
              className={`flex-1 px-4 py-3 rounded-lg border text-left ${
                inputMode === "url"
                  ? "border-teal-500 bg-teal-50/40"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Globe className="w-4 h-4 text-teal-600 mb-1" />
              <p className="text-sm font-semibold text-gray-900">Website URL</p>
              <p className="text-xs text-gray-500">
                We'll crawl public pages and extract long-form content.
              </p>
            </button>
            <button
              onClick={() => setInputMode("paste")}
              className={`flex-1 px-4 py-3 rounded-lg border text-left ${
                inputMode === "paste"
                  ? "border-teal-500 bg-teal-50/40"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <AlignLeft className="w-4 h-4 text-teal-600 mb-1" />
              <p className="text-sm font-semibold text-gray-900">Paste samples</p>
              <p className="text-xs text-gray-500">
                Paste 3+ snippets separated by blank lines.
              </p>
            </button>
          </div>

          {inputMode === "url" ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          ) : (
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder="Paste 3+ sample paragraphs separated by blank lines…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          )}

          {error && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={handleStart}
              isLoading={start.isPending}
              disabled={inputMode === "url" ? !url.trim() : pasted.trim().length < 50}
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              Start analysis
            </Button>
          </div>
        </div>
      )}

      {phase === "processing" && progress && <VoiceAnalyzerProcessing progress={progress} />}

      {phase === "failed" && progress && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-rose-900 mb-2">Analysis failed</h3>
          <ul className="text-sm text-rose-700 list-disc pl-5 space-y-1">
            {progress.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={handleReset}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {phase === "review" && progress?.result && (
        <VoiceAnalyzerReview
          result={progress.result}
          onApplied={onNavigateToGuide}
          onReset={handleReset}
        />
      )}
    </PageShell>
  );
}
