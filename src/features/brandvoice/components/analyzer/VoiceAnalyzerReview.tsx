"use client";

import { useState } from "react";
import { Check, X, Sparkles, ArrowRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/shared";
import { useUpdateVoiceguide } from "../../hooks";
import type { VoiceAnalysisResult, ChannelKey } from "../../types/voiceguide.types";

interface VoiceAnalyzerReviewProps {
  result: VoiceAnalysisResult;
  onApplied: () => void;
  onReset: () => void;
}

interface SectionToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  rationale?: string;
  children: React.ReactNode;
}

function SectionToggle({ label, enabled, onToggle, rationale, children }: SectionToggleProps) {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 ${enabled ? "border-teal-300" : "border-gray-200"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
          {rationale && <p className="text-xs text-gray-500 mt-0.5 italic">{rationale}</p>}
        </div>
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
            enabled
              ? "bg-teal-50 text-teal-700 border-teal-200"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
          }`}
        >
          {enabled ? (
            <>
              <Check className="w-3.5 h-3.5 inline mr-1" /> Applying
            </>
          ) : (
            <>
              <X className="w-3.5 h-3.5 inline mr-1" /> Skip
            </>
          )}
        </button>
      </div>
      <div className={enabled ? "" : "opacity-50"}>{children}</div>
    </div>
  );
}

export function VoiceAnalyzerReview({ result, onApplied, onReset }: VoiceAnalyzerReviewProps) {
  const update = useUpdateVoiceguide();

  // Per-section enabled state — user can opt out of any block
  const [enabled, setEnabled] = useState({
    voice: true,
    samples: true,
    vocabulary: true,
    channels: true,
    antiPatterns: true,
  });
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: keyof typeof enabled) => setEnabled((s) => ({ ...s, [key]: !s[key] }));

  const handleApply = async () => {
    setError(null);
    const patch: Record<string, unknown> = {};

    if (enabled.voice) {
      patch.voiceDescription = result.voiceDescription;
      patch.toneDimensions = result.toneDimensions;
    }
    if (enabled.samples) {
      patch.writingSamples = result.writingSamples;
    }
    if (enabled.vocabulary) {
      patch.wordsWeUse = result.wordsWeUse;
      patch.wordsWeAvoid = result.wordsWeAvoid;
    }
    if (enabled.channels) {
      patch.channelTones = result.channelTones;
    }
    if (enabled.antiPatterns) {
      patch.antiPatterns = result.antiPatterns;
    }
    patch.source = "analyzer";

    try {
      await update.mutateAsync(patch);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply analyzer suggestions");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-emerald-900">Analysis ready</h3>
          <p className="text-xs text-emerald-700">
            Review each block below. Toggle any you want to skip — only enabled blocks
            are written to the voiceguide.
          </p>
        </div>
      </div>

      {/* Voice description + tone */}
      <SectionToggle
        label="Voice description + tone (4-axis)"
        enabled={enabled.voice}
        onToggle={() => toggle("voice")}
        rationale={result.rationale.voice}
      >
        <p className="text-sm text-gray-700 mb-3">{result.voiceDescription}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(Object.entries(result.toneDimensions) as Array<[string, number]>).map(([axis, value]) => (
            <div key={axis} className="px-2 py-1 bg-gray-50 rounded">
              <span className="font-mono text-gray-500">{axis}:</span>{" "}
              <span className="font-medium text-gray-900">{value}/7</span>
            </div>
          ))}
        </div>
      </SectionToggle>

      {/* Writing samples */}
      <SectionToggle
        label={`Writing samples (${result.writingSamples.length})`}
        enabled={enabled.samples}
        onToggle={() => toggle("samples")}
        rationale={result.rationale.samples}
      >
        <div className="space-y-2">
          {result.writingSamples.slice(0, 3).map((s, i) => (
            <div key={i} className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
              {s.length > 200 ? s.slice(0, 200) + "…" : s}
            </div>
          ))}
          {result.writingSamples.length > 3 && (
            <p className="text-xs text-gray-400">+ {result.writingSamples.length - 3} more</p>
          )}
        </div>
      </SectionToggle>

      {/* Vocabulary */}
      <SectionToggle
        label="Vocabulary"
        enabled={enabled.vocabulary}
        onToggle={() => toggle("vocabulary")}
        rationale={result.rationale.vocabulary}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Words we use ({result.wordsWeUse.length})</p>
            <div className="flex flex-wrap gap-1">
              {result.wordsWeUse.map((w, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-xs">{w}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Words we avoid ({result.wordsWeAvoid.length})</p>
            <div className="flex flex-wrap gap-1">
              {result.wordsWeAvoid.map((w, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-xs">{w}</span>
              ))}
            </div>
          </div>
        </div>
      </SectionToggle>

      {/* Channel tones */}
      <SectionToggle
        label="Channel tones"
        enabled={enabled.channels}
        onToggle={() => toggle("channels")}
        rationale={result.rationale.channels}
      >
        <div className="space-y-2">
          {(Object.keys(result.channelTones) as ChannelKey[]).map((ch) => {
            const entry = result.channelTones[ch];
            if (!entry) return null;
            return (
              <div key={ch} className="text-xs">
                <span className="font-medium text-gray-700 capitalize">{ch}:</span>{" "}
                <span className="text-gray-600">{entry.description}</span>
              </div>
            );
          })}
        </div>
      </SectionToggle>

      {/* Anti-patterns */}
      <SectionToggle
        label={`Anti-patterns (${result.antiPatterns.length})`}
        enabled={enabled.antiPatterns}
        onToggle={() => toggle("antiPatterns")}
        rationale={result.rationale.antiPatterns}
      >
        <div className="flex flex-wrap gap-1">
          {result.antiPatterns.map((p, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">{p}</span>
          ))}
        </div>
      </SectionToggle>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RefreshCcw className="w-3.5 h-3.5 mr-1" />
          Run again
        </Button>
        <Button variant="primary" size="md" onClick={handleApply} isLoading={update.isPending}>
          Apply to voiceguide
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
