'use client';

// =============================================================
// F40-bis (audit 2026-05-13): Brand-style anchor management UI
// =============================================================
// In Brand Foundation page: select 3-10 MediaAssets als brand visual
// anchors. Elke image-generation gebruikt deze als style-reference
// (Recraft V4 style-ID / Nano Banana fusion / FLUX 2 multi-ref).
// API: GET / PUT /api/workspace/brand-style-anchors.
// =============================================================

import React, { useState, useEffect } from 'react';
import { Plus, X, Sparkles, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useMediaAssets } from '@/features/media-library/hooks';

interface Anchor {
  mediaAssetId: string;
  fileUrl: string;
  alt: string | null;
}

// W5 L-Fase 3 — anchor-curatie (plan §5 T2): logo-dominante referentiebeelden
// leren het model dat logo na te maken in elke generatie.
type LogoProminence = 'none' | 'incidental' | 'dominant';
interface AnchorLogoFinding {
  mediaAssetId: string;
  visibleLogo: boolean;
  prominence: LogoProminence;
  rationale: string;
}
interface AnchorLogoAudit {
  findings: AnchorLogoFinding[];
  dominantCount: number;
  visibleCount: number;
  warning: string | null;
}

export function BrandStyleAnchorsPanel() {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // W5 L-Fase 3 — anchor logo-audit (opt-in, vision-call per anchor).
  const [audit, setAudit] = useState<AnchorLogoAudit | null>(null);
  const [auditing, setAuditing] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/workspace/brand-style-anchors')
      .then((res) => (res.ok ? res.json() : { anchors: [] }))
      .then((data: { anchors?: Anchor[] }) => {
        if (!cancelled) {
          setAnchors(Array.isArray(data.anchors) ? data.anchors : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fetch failed');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (newAnchors: Anchor[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace/brand-style-anchors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchorIds: newAnchors.map((a) => a.mediaAssetId) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Save failed (${res.status})`);
      }
      const data = (await res.json()) as { anchors?: Anchor[] };
      setAnchors(data.anchors ?? newAnchors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id: string) => {
    void persist(anchors.filter((a) => a.mediaAssetId !== id));
    setAudit(null); // stale na wijziging
  };

  const runAudit = async () => {
    setAuditing(true);
    setError(null);
    try {
      const res = await fetch('/api/workspace/brand-style-anchors?audit=1');
      if (!res.ok) throw new Error(`Audit mislukt (${res.status})`);
      const data = (await res.json()) as { logoAudit?: AnchorLogoAudit };
      setAudit(data.logoAudit ?? { findings: [], dominantCount: 0, visibleCount: 0, warning: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit mislukt');
    } finally {
      setAuditing(false);
    }
  };

  /** Prominentie per anchor uit de laatste audit (voor de badge op de tegel). */
  const prominenceOf = (id: string): LogoProminence | null =>
    audit?.findings.find((f) => f.mediaAssetId === id)?.prominence ?? null;

  const handleAdd = (asset: { id: string; fileUrl: string; name?: string | null }) => {
    if (anchors.length >= 10) {
      setError('Maximum 10 anchors. Remove one first.');
      return;
    }
    if (anchors.some((a) => a.mediaAssetId === asset.id)) {
      setPickerOpen(false);
      return;
    }
    const newAnchors: Anchor[] = [
      ...anchors,
      { mediaAssetId: asset.id, fileUrl: asset.fileUrl, alt: asset.name ?? null },
    ];
    void persist(newAnchors);
    setAudit(null); // stale na wijziging
    setPickerOpen(false);
  };

  const count = anchors.length;
  const countLabel = count < 3 ? `${count} (3-10 recommended)` : `${count} active`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-900">Brand-style anchors</h3>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                count >= 3
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {countLabel}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            3-10 reference images that represent how the brand should feel visually. Every image
            generation injects these as style references (Recraft / Nano Banana / FLUX 2) for a
            consistent brand look across campaigns.
          </p>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* W5 L-Fase 3 — anchor-curatie: check op logo-dominante anchors. */}
      {!loading && count > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={runAudit}
            disabled={auditing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-purple-700 disabled:opacity-50"
          >
            {auditing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            Controleer anchors op logo&apos;s
          </button>
          {audit && (
            audit.warning ? (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{audit.warning}</span>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-emerald-700">
                Geen logo-dominante anchors gevonden{audit.visibleCount > 0 ? ` (${audit.visibleCount} met een klein/onopvallend logo)` : ''}.
              </p>
            )
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading anchors...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {anchors.map((anchor) => (
              <div
                key={anchor.mediaAssetId}
                className="group relative rounded-md overflow-hidden border border-gray-200 aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={anchor.fileUrl}
                  alt={anchor.alt ?? 'Anchor'}
                  className="w-full h-full object-cover"
                />
                {prominenceOf(anchor.mediaAssetId) === 'dominant' && (
                  <span
                    className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded bg-amber-500/95 px-1 py-0.5 text-[9px] font-semibold text-white shadow-sm"
                    title="Dit beeld toont een prominent logo — vervang het voor schone generaties"
                  >
                    <ShieldAlert className="h-2.5 w-2.5" />
                    logo
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(anchor.mediaAssetId)}
                  disabled={saving}
                  className="absolute top-1 right-1 p-1 rounded-full bg-white/95 hover:bg-red-50 text-gray-700 hover:text-red-600 shadow-sm border border-gray-200 transition-colors"
                  title="Remove anchor"
                  aria-label="Remove anchor"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {count < 10 && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={saving}
                className="aspect-square rounded-md border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-purple-700 transition-colors disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            )}
          </div>

          {count === 0 && (
            <div className="mt-3 text-[11px] text-gray-500 italic">
              No anchors set. Image generation still works without them, but brand consistency
              requires a curated set of anchors.
            </div>
          )}
        </>
      )}

      {pickerOpen && (
        <AnchorPickerModal
          onClose={() => setPickerOpen(false)}
          onPicked={handleAdd}
          excludeIds={anchors.map((a) => a.mediaAssetId)}
        />
      )}
    </div>
  );
}

// ─── Picker modal — selecteer uit Media Library ──────────────────────

function AnchorPickerModal({
  onClose,
  onPicked,
  excludeIds,
}: {
  onClose: () => void;
  onPicked: (asset: { id: string; fileUrl: string; name?: string | null }) => void;
  excludeIds: string[];
}) {
  const { data, isLoading } = useMediaAssets({ mediaType: 'IMAGE' as never, limit: 60 });
  const assets = (data?.assets ?? []).filter(
    (a: { id: string; mediaType: string }) =>
      !excludeIds.includes(a.id) && a.mediaType === 'IMAGE',
  ) as Array<{ id: string; fileUrl: string; thumbnailUrl?: string | null; name?: string | null; mediaType: string }>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Pick a media asset as anchor</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading library...
            </div>
          ) : assets.length === 0 ? (
            <p className="text-xs text-gray-500">
              No image assets found in the Media Library. Upload some reference images first.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onPicked({ id: asset.id, fileUrl: asset.fileUrl, name: asset.name })}
                  className="aspect-square rounded-md overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.thumbnailUrl ?? asset.fileUrl}
                    alt={asset.name ?? 'Asset'}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
