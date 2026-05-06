'use client';

import React from 'react';
import { X, ShieldCheck, AlertTriangle, ImageOff, Palette, Eye } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import type {
  VisualColorAlignmentDetail,
  VisualJudgeDetail,
} from '../../api/canvas.api';

const ZONE = {
  good: { hex: '#10b981', label: 'On-brand' },
  warn: { hex: '#f59e0b', label: 'Off-target' },
  bad: { hex: '#ef4444', label: 'Off-brand' },
} as const;

const QUALITY_HEX: Record<string, string> = {
  exact: '#10b981',
  close: '#22c55e',
  acceptable: '#84cc16',
  noticeable: '#f59e0b',
  different: '#ef4444',
};

function zoneFor(score: number): keyof typeof ZONE {
  if (score >= 70) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

interface VisualFidelityDetailProps {
  componentId: string;
  imageUrl: string;
  onClose: () => void;
}

/**
 * Click-expanded detail panel for a single image's G8 visual fidelity score.
 *
 * Renders three sections:
 *   1. Header — composite score + zone label + image thumbnail
 *   2. Color alignment — generated swatches matched to brand palette,
 *      ΔE per match, unmatched colors flagged
 *   3. AI-judge dimensions — per-dimension scores with rationales
 *
 * Closes on Escape or backdrop click. Reads detail from canvas store
 * (populated by either the SSE flow with details on rescore, or the
 * /components GET hydrate path).
 */
export function VisualFidelityDetail({
  componentId,
  imageUrl,
  onClose,
}: VisualFidelityDetailProps) {
  const score = useCanvasStore((s) => s.visualFidelityScores.get(componentId));

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!score) return null;

  const composite = score.compositeScore ?? 0;
  const zone = ZONE[zoneFor(composite)];

  const colorAlignment = score.colorAlignment;
  const judge =
    score.aiJudgeDimensions && !('skipped' in score.aiJudgeDimensions)
      ? (score.aiJudgeDimensions as VisualJudgeDetail)
      : null;
  const judgeSkipped =
    !!score.aiJudgeDimensions && 'skipped' in score.aiJudgeDimensions;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-start gap-4 p-5 border-b border-gray-200">
          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {score.stage === 'computing' ? (
                <span className="text-sm text-gray-500">Scoring…</span>
              ) : score.stage === 'skipped' ? (
                <>
                  <ImageOff className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Score unavailable
                  </span>
                </>
              ) : (
                <>
                  {zone === ZONE.good ? (
                    <ShieldCheck className="h-5 w-5" style={{ color: zone.hex }} />
                  ) : (
                    <AlertTriangle className="h-5 w-5" style={{ color: zone.hex }} />
                  )}
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: zone.hex }}
                  >
                    {Math.round(composite)}
                  </span>
                  <span className="text-sm text-gray-500">/ 100</span>
                  <span
                    className="text-sm font-medium ml-2"
                    style={{ color: zone.hex }}
                  >
                    {zone.label}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {score.judgeSkipped
                ? 'Composite based on color alignment only — AI judge unavailable.'
                : `Composite of color alignment (40%) + AI judge (60%). Threshold for publishable: 70.`}
            </p>
            {score.errorMessage && (
              <p className="text-xs text-red-600 mt-1">
                {score.errorMessage}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Color alignment ────────────────────────── */}
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
            <Palette className="h-4 w-4 text-gray-600" />
            Color alignment
            {colorAlignment && (
              <span className="text-xs text-gray-500 font-normal">
                — {colorAlignment.score}/100
              </span>
            )}
          </h3>
          {colorAlignment ? (
            <ColorAlignmentTable detail={colorAlignment} />
          ) : (
            <p className="text-xs text-gray-500">
              Color match data unavailable on this score.
            </p>
          )}
        </div>

        {/* ── AI judge dimensions ────────────────────── */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
            <Eye className="h-4 w-4 text-gray-600" />
            AI judge dimensions
            {judge && (
              <span className="text-xs text-gray-500 font-normal">
                — {judge.composite}/100
              </span>
            )}
          </h3>
          {judge ? (
            <JudgeDimensions detail={judge} />
          ) : judgeSkipped ? (
            <p className="text-xs text-gray-500">
              AI judge was skipped for this score (no API key or call failure).
              Composite reflects color alignment alone.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              AI judge data unavailable on this score.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ColorAlignmentTableProps {
  detail: VisualColorAlignmentDetail;
}

function ColorAlignmentTable({ detail }: ColorAlignmentTableProps) {
  const ordered = [...detail.matches].sort(
    (a, b) => b.generatedPopulation - a.generatedPopulation,
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-2">
          Top {Math.min(ordered.length, 6)} swatches in image, matched to nearest
          brand color via ΔE in Lab space.
        </p>
        <div className="space-y-1.5">
          {ordered.slice(0, 6).map((m, i) => (
            <div
              key={`${m.generatedHex}-${i}`}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block w-5 h-5 rounded border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: m.generatedHex }}
                title={m.generatedHex}
              />
              <span className="font-mono text-gray-600 w-16 tabular-nums">
                {m.generatedHex}
              </span>
              <span className="text-gray-400 text-[11px] w-10 tabular-nums">
                {m.generatedPopulation.toFixed(1)}%
              </span>
              <span className="text-gray-400">→</span>
              {m.brandHex ? (
                <>
                  <span
                    className="inline-block w-5 h-5 rounded border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: m.brandHex }}
                    title={`${m.brandHex} (${m.brandCategory ?? 'brand'})`}
                  />
                  <span className="font-mono text-gray-600 w-16 tabular-nums">
                    {m.brandHex}
                  </span>
                </>
              ) : (
                <span className="text-gray-400 italic">no match</span>
              )}
              <span
                className="text-[11px] font-medium ml-auto px-2 py-0.5 rounded"
                style={{
                  color: QUALITY_HEX[m.matchQuality],
                  backgroundColor: `${QUALITY_HEX[m.matchQuality]}15`,
                }}
              >
                ΔE {m.deltaE.toFixed(1)} · {m.matchQuality}
              </span>
            </div>
          ))}
        </div>
      </div>

      {detail.matchedBrandHexes.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-500 mb-1">
            Brand colors detected ({detail.matchedBrandHexes.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {detail.matchedBrandHexes.map((hex) => (
              <span
                key={hex}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-200 text-[10px] font-mono"
              >
                <span
                  className="inline-block w-3 h-3 rounded border border-gray-300"
                  style={{ backgroundColor: hex }}
                />
                {hex}
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.unmatchedColors.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-500 mb-1">
            Off-brand swatches ({detail.unmatchedColors.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {detail.unmatchedColors.slice(0, 8).map((c, i) => (
              <span
                key={`${c.hex}-${i}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-[10px] font-mono"
                title={`${c.hex} — ${c.population.toFixed(1)}% of image`}
              >
                <span
                  className="inline-block w-3 h-3 rounded border border-red-300"
                  style={{ backgroundColor: c.hex }}
                />
                {c.hex}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface JudgeDimensionsProps {
  detail: VisualJudgeDetail;
}

function JudgeDimensions({ detail }: JudgeDimensionsProps) {
  const entries = Object.entries(detail.dimensions);
  return (
    <div className="space-y-2">
      {entries.map(([key, dim]) => {
        const zone = ZONE[zoneFor(dim.score)];
        const flagged = detail.flagged.includes(key);
        return (
          <div key={key} className="border border-gray-200 rounded p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-900 capitalize flex-1">
                {key.replace(/-/g, ' ')}
              </span>
              {flagged && (
                <span className="text-[10px] text-red-600 font-medium uppercase">
                  flagged
                </span>
              )}
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: zone.hex }}
              >
                {dim.score}
              </span>
              <span className="text-[11px] text-gray-400">/100</span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              {dim.rationale}
            </p>
          </div>
        );
      })}
    </div>
  );
}
