'use client';

import { useEffect, useMemo, useState } from 'react';
import { Render, type Config, type Data } from '@puckeditor/core';
import { X, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import type { SpikePuckProps } from './puck-config';
import {
  diffComponentIds,
  mergeAcceptedComponents,
  type DiffMergeData,
} from '@/lib/landing-pages/diff-merge';

type SpikeData = Data<SpikePuckProps>;

interface Props {
  config: Config<SpikePuckProps>;
  current: SpikeData;
  proposed: SpikeData;
  /** Page-quality score before this proposal (0-100, threshold 70). */
  scoreBefore: number;
  /** Projected score if user accepts all components. */
  scoreProjected: number;
  threshold: number;
  /** Source of the proposal — drives header copy. */
  source: 'auto-iterate' | 'strict-rewrite';
  /** Callback fires with the merged data — only accepted components carry proposal-side props. */
  onAccept: (merged: SpikeData) => void;
  onReject: () => void;
}

/**
 * Page-level diff-preview modal for the Phase 6 auto-iterate and
 * strict-rewrite flows. Side-by-side dual `<Render>` of full Puck trees
 * with a per-component accept/reject lane. Lock-icon badge on locked
 * components (skipped by the AI per Phase 5 enforcement).
 *
 * Optie B (always diff-preview) implementation per ADR 2026-05-22.
 */
export function PageDiffPreviewModal({
  config,
  current,
  proposed,
  scoreBefore,
  scoreProjected,
  threshold,
  source,
  onAccept,
  onReject,
}: Props) {
  const changedIds = useMemo(
    () => diffComponentIds(current as DiffMergeData, proposed as DiffMergeData),
    [current, proposed],
  );
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set(changedIds));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onReject]);

  const handleAcceptSelected = () => {
    const merged = mergeAcceptedComponents(
      current as DiffMergeData,
      proposed as DiffMergeData,
      Array.from(acceptedIds),
    );
    onAccept(merged as SpikeData);
  };

  const toggleId = (id: string) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sourceLabel = source === 'auto-iterate' ? 'Auto-iterate' : 'Strict-rewrite';
  const acceptedCount = acceptedIds.size;
  const scoreDelta = scoreProjected - scoreBefore;
  const scoreImproves = scoreDelta > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onReject}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 1400,
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#0f172a' }}>
              {sourceLabel} — pagina-voorstel
            </h2>
            <p style={{ fontSize: 13, margin: '4px 0 0', color: '#64748b' }}>
              {changedIds.length} van {current.content.length} componenten gewijzigd, {acceptedCount} geaccepteerd
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ScoreBadge score={scoreBefore} threshold={threshold} label="Huidig" />
            <ArrowRight size={16} color="#94a3b8" />
            <ScoreBadge
              score={scoreProjected}
              threshold={threshold}
              label={scoreImproves ? `+${scoreDelta}` : `${scoreDelta}`}
              highlight={scoreImproves}
            />
            <button
              type="button"
              onClick={onReject}
              aria-label="Sluiten"
              className="inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* High edit-distance warning */}
        {changedIds.length > current.content.length * 0.7 ? (
          <div
            style={{
              padding: '10px 24px',
              background: '#fef3c7',
              borderBottom: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#92400e',
              fontSize: 13,
            }}
          >
            <AlertTriangle size={16} />
            Grote wijziging — &gt;70% van de page wordt aangepast. Review zorgvuldig.
          </div>
        ) : null}

        {/* Per-component accept lane */}
        <div
          style={{
            padding: '12px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginRight: 8 }}>
            Componenten:
          </span>
          {current.content.map((item) => {
            const id = (item.props as { id?: string }).id;
            if (!id) return null;
            const isChanged = changedIds.includes(id);
            const isAccepted = acceptedIds.has(id);
            const isLocked = (item.props as { metadata?: { locked?: boolean } }).metadata?.locked === true;

            return (
              <button
                key={id}
                type="button"
                onClick={() => isChanged && !isLocked && toggleId(id)}
                disabled={!isChanged || isLocked}
                title={isLocked ? 'Locked — niet gewijzigd' : isChanged ? 'Toggle accept' : 'Geen wijziging'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: '1px solid',
                  borderColor: isLocked
                    ? '#cbd5e1'
                    : isAccepted
                      ? '#0891b2'
                      : isChanged
                        ? '#e2e8f0'
                        : '#f1f5f9',
                  background: isLocked
                    ? '#f1f5f9'
                    : isAccepted
                      ? '#cffafe'
                      : isChanged
                        ? '#ffffff'
                        : '#f1f5f9',
                  color: isLocked ? '#94a3b8' : isAccepted ? '#0e7490' : '#475569',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: isChanged && !isLocked ? 'pointer' : 'not-allowed',
                }}
              >
                {isAccepted ? <Check size={12} /> : null}
                {item.type}
                {isLocked ? ' 🔒' : ''}
              </button>
            );
          })}
        </div>

        {/* Dual-render panes */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            background: '#e2e8f0',
            overflow: 'auto',
          }}
        >
          <PreviewPane label="Huidig" data={current} config={config} accent="#475569" />
          <PreviewPane label="Voorgesteld" data={proposed} config={config} accent="#0891b2" />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAcceptedIds(new Set(changedIds))}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
            >
              Selecteer alle
            </button>
            <button
              type="button"
              onClick={() => setAcceptedIds(new Set())}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
            >
              Deselecteer alle
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReject}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
            >
              Afwijzen
            </button>
            <button
              type="button"
              onClick={handleAcceptSelected}
              disabled={acceptedCount === 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-opacity"
            >
              <Check className="h-4 w-4" />
              {acceptedCount === current.content.length
                ? 'Alle accepteren'
                : `${acceptedCount} accepteren`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPane({
  label,
  data,
  config,
  accent,
}: {
  label: string;
  data: SpikeData;
  config: Config<SpikePuckProps>;
  accent: string;
}) {
  return (
    <div style={{ background: '#ffffff', padding: 16, overflow: 'auto' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: accent,
          textTransform: 'uppercase',
          marginBottom: 12,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        {data && (data as { root?: unknown }).root && Array.isArray((data as { content?: unknown }).content) ? (
          <Render config={config} data={data} />
        ) : (
          <div style={{ padding: 24, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
            (Geen preview-data beschikbaar — auto-iterate response had geen valid puckData-tree.)
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({
  score,
  threshold,
  label,
  highlight,
}: {
  score: number;
  threshold: number;
  label: string;
  highlight?: boolean;
}) {
  const passes = score >= threshold;
  const bg = highlight ? '#cffafe' : passes ? '#dcfce7' : '#fef3c7';
  const color = highlight ? '#0e7490' : passes ? '#15803d' : '#92400e';
  return (
    <div
      style={{
        background: bg,
        color,
        padding: '6px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 1.2,
        minWidth: 70,
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.8 }}>{label}</span>
      <span style={{ fontSize: 14 }}>{score}/{threshold}</span>
    </div>
  );
}

