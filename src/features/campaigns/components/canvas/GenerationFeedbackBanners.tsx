'use client';

// =============================================================
// GenerationFeedbackBanners — content-test improvements #1 + #8.
// Rendert twee context-banners in canvas:
//   1. BrandVoiceBanner — info-banner over toegepast voice-niveau,
//      met fallback-warning wanneer geen voiceguide geconfigureerd is.
//   2. IterationNudges — quick-action chips na generation-complete
//      ("Een sectie herzien" / "LinkedIn-variant maken" / ...).
// =============================================================

import { Info, AlertCircle, Sparkles } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';

export function GenerationFeedbackBanners() {
  return (
    <>
      <BrandVoiceBanner />
      <IterationNudgesChips />
    </>
  );
}

// ─── Brand-voice banner ────────────────────────────────────

function BrandVoiceBanner() {
  const status = useCanvasStore((s) => s.brandVoiceStatus);
  if (!status.level || !status.userMessage) return null;

  // Voiceguide actief = subtle info-pill; fallback = duidelijker waarschuwing
  if (!status.isFallback) {
    return (
      <div className="mx-4 my-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-700">
        <Info className="w-3.5 h-3.5" />
        {status.userMessage}
      </div>
    );
  }
  return (
    <div className="mx-4 my-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-900 flex-1">{status.userMessage}</div>
    </div>
  );
}

// ─── Iteration-nudges chips ────────────────────────────────

function IterationNudgesChips() {
  const nudges = useCanvasStore((s) => s.iterationNudges);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  if (globalStatus !== 'complete' || nudges.length === 0) return null;

  return (
    <div className="mx-4 my-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-gray-700">Volgende stap?</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {nudges.map((n) => (
          <button
            key={n.id}
            type="button"
            data-intent={n.intent}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/30 bg-white text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            {n.label}
          </button>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-gray-500">
        Tip: kies een nudge om de iteratie automatisch op te starten (wiring volgt in derive-flow follow-up).
      </div>
    </div>
  );
}
