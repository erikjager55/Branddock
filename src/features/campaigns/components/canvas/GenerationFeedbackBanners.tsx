'use client';

// =============================================================
// GenerationFeedbackBanners — content-test improvements #1 + #7 + #8.
// Rendert twee context-banners in canvas:
//   1. BrandVoiceBanner — info-banner over toegepast voice-niveau,
//      met fallback-warning wanneer geen voiceguide geconfigureerd is.
//   2. IterationNudges — quick-action chips na generation-complete
//      ("Een sectie herzien" / "LinkedIn-variant maken" / ...).
//      Derive-nudges roepen /api/studio/[id]/derive aan en navigeren
//      naar het nieuw aangemaakte deliverable.
// =============================================================

import { useState } from 'react';
import { Info, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
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
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (globalStatus !== 'complete' || nudges.length === 0) return null;

  async function handleNudgeClick(nudge: (typeof nudges)[number]) {
    if (nudge.intent !== 'derive' || !nudge.targetContentTypeId || !deliverableId) {
      // Non-derive intents (revise_section, adjust_tone, add_image) zijn
      // UI-handlers in andere panels; chip dient daar als visuele cue.
      return;
    }
    setBusyId(nudge.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/derive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetContentTypeId: nudge.targetContentTypeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Derive failed: ${res.status}`);
      }
      const data = (await res.json()) as { newDeliverableId: string };
      // Navigeer naar het nieuwe deliverable; canvas-page picks up de id
      // via URL of state. Voor v1 reload met query-param.
      window.location.href = `/?deliverableId=${data.newDeliverableId}`;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Derive mislukt');
      setBusyId(null);
    }
  }

  return (
    <div className="mx-4 my-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-gray-700">Volgende stap?</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {nudges.map((n) => {
          const isBusy = busyId === n.id;
          const isDerive = n.intent === 'derive' && !!n.targetContentTypeId;
          return (
            <button
              key={n.id}
              type="button"
              data-intent={n.intent}
              onClick={() => handleNudgeClick(n)}
              disabled={isBusy || (isDerive && !deliverableId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary/30 bg-white text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
              {n.label}
            </button>
          );
        })}
      </div>
      {errorMsg && (
        <div className="mt-2 text-[11px] text-red-700">{errorMsg}</div>
      )}
      <div className="mt-2 text-[10px] text-gray-500">
        Derive-chips maken direct een nieuwe deliverable; andere chips zijn cues voor revisie-flow.
      </div>
    </div>
  );
}
