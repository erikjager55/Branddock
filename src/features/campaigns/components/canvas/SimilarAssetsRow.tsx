'use client';

// =============================================================
// F42-bis (audit 2026-05-13): Cross-content similar-assets suggestion row
// =============================================================
// Toont bovenaan ImageSourcePanel Library-tab een rij met assets uit de
// Media Library die matchen tegen briefingText keywords (via aiTags
// overlap, gevuld door F41 DAM tagger). 1-click insert als hero.
// =============================================================

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import type { InsertImageSelection } from './insert-image/types';

interface SimilarAsset {
  asset: {
    id: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    name: string | null;
    aiDescription: string | null;
  };
  matchCount: number;
  matchedKeywords: string[];
}

interface SimilarAssetsRowProps {
  /** Source briefingText om keywords uit te extraheren. */
  briefingText: string;
  /** Callback wanneer user een asset kiest. */
  onPick: (selection: InsertImageSelection) => void;
}

export function SimilarAssetsRow({ briefingText, onPick }: SimilarAssetsRowProps) {
  const { t } = useTranslation('campaigns-canvas');
  const [matches, setMatches] = useState<SimilarAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!briefingText.trim() || briefingText.trim().length < 8) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/media/similar?keywords=${encodeURIComponent(briefingText)}&limit=6`)
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
  }, [briefingText]);

  if (!briefingText.trim() || briefingText.trim().length < 8) return null;
  if (!loading && matches.length === 0) return null;

  return (
    <div className="mb-3 rounded-md border border-purple-200 bg-purple-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
        <span className="text-xs font-semibold text-purple-900">
          {t('similarAssets.title')}
        </span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-purple-600" />}
      </div>
      {matches.length > 0 ? (
        <>
          <p className="text-[11px] text-purple-700 mb-2 leading-relaxed">
            {t('similarAssets.subtitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <button
                key={m.asset.id}
                type="button"
                onClick={() =>
                  onPick({
                    url: m.asset.fileUrl,
                    mediaAssetId: m.asset.id,
                    alt: m.asset.name ?? undefined,
                  })
                }
                className="group relative rounded-md overflow-hidden border-2 border-purple-200 hover:border-purple-500 transition-colors w-20 h-20"
                title={t('similarAssets.matchTooltip', {
                  keywords: m.matchedKeywords.join(', '),
                  count: m.matchCount,
                })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.asset.thumbnailUrl ?? m.asset.fileUrl}
                  alt={m.asset.name ?? t('similarAssets.suggestedAlt')}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-purple-700/80 text-white text-[9px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('similarAssets.matchCount', { count: m.matchCount })}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-purple-700">{t('similarAssets.noMatches')}</p>
      )}
    </div>
  );
}
