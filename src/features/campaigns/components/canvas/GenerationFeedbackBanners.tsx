'use client';

// =============================================================
// GenerationFeedbackBanners — voiceguide fallback warning only.
//
// F34 (audit 2026-05-13): IterationNudgesPanel verwijderd op user-
// feedback; was niet gebruikt als beoogd en voegde visuele ruis toe.
// F23 (eerder): success-state voiceguide-badge verwijderd; alleen de
// amber fallback-warning blijft (genuine info wanneer voiceguide
// ontbreekt op workspace).
// =============================================================

import { AlertCircle } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';

export function GenerationFeedbackBanners() {
  return <BrandVoiceBanner />;
}

function BrandVoiceBanner() {
  const status = useCanvasStore((s) => s.brandVoiceStatus);
  if (!status.level || !status.userMessage) return null;
  // Success-state weg sinds F23 — toonde "Voiceguide actief" badge zonder
  // user-waarde. Alleen fallback-warning blijft.
  if (!status.isFallback) return null;

  return (
    <div
      className="mx-4 mt-3 mb-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2"
      data-testid="brand-voice-banner-fallback"
    >
      <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-900 flex-1 leading-relaxed">
        {status.userMessage}
      </div>
    </div>
  );
}
