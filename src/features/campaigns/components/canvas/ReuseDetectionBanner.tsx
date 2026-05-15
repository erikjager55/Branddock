'use client';

import React from 'react';
import { Lightbulb, Loader2, X } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import type { InsertImageSelection } from './insert-image/types';

/**
 * Pattern G2 image-quality-chain — Reuse-detection banner.
 *
 * Toont in Canvas Step 2 (Generate-source) een suggestion banner met
 * semantic-similar MediaAssets uit de workspace library, vóór gebruiker
 * klikt op "Generate visual". Doel: voorkomen dat user een nieuwe FLUX/
 * Gemini call maakt terwijl een vergelijkbaar beeld al bestaat (cost +
 * brand-consistency winst).
 *
 * Threshold ≥ 0.75 cosine-similarity, max 4 matches getoond compact.
 * Dismissable via X-knop; preference niet persisted (1 sessie scope).
 */

interface SimilarAsset {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  aiDescription: string | null;
  similarity: number;
  mediaType: string;
}

interface ReuseDetectionBannerProps {
  /** Callback wanneer user een asset uit de library kiest om te hergebruiken. */
  onPick: (selection: InsertImageSelection) => void;
}

export function ReuseDetectionBanner({ onPick }: ReuseDetectionBannerProps) {
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const briefingText = visualBrief.briefingText?.trim() ?? '';
  const [matches, setMatches] = React.useState<SimilarAsset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (briefingText.length < 8 || dismissed) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(
      `/api/media/similar-semantic?q=${encodeURIComponent(briefingText)}&threshold=0.75&limit=4`,
    )
      .then((res) => (res.ok ? res.json() : { matches: [] }))
      .then((data: { matches?: SimilarAsset[] }) => {
        if (!cancelled) {
          setMatches(Array.isArray(data.matches) ? data.matches : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMatches([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [briefingText, dismissed]);

  if (briefingText.length < 8) return null;
  if (dismissed) return null;
  if (!loading && matches.length === 0) return null;

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 mb-3">
      <div className="flex items-start gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-900">
              Vergelijkbaar beeld bestaat al in je library
            </span>
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />
            ) : (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-emerald-600 hover:text-emerald-900 transition-colors"
                title="Negeer suggestie en genereer toch"
                aria-label="Verberg banner"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-emerald-800 leading-snug mb-2">
            Hergebruik bespaart een generation-call (≈ $0.13) én verbetert visuele
            consistentie tussen content-items. Klik op een asset om in te voegen,
            of negeer via het kruisje om alsnog nieuw te genereren.
          </p>
          {matches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onPick({
                      url: m.fileUrl,
                      mediaAssetId: m.id,
                      alt: m.name,
                    })
                  }
                  className="group relative rounded-md overflow-hidden border-2 border-emerald-300 hover:border-emerald-600 transition-colors w-20 h-20"
                  title={`${m.name} — ${Math.round(m.similarity * 100)}% match${m.aiDescription ? `\n${m.aiDescription}` : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbnailUrl ?? m.fileUrl}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-emerald-800/85 text-white text-[9px] text-center py-0.5">
                    {Math.round(m.similarity * 100)}%
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
