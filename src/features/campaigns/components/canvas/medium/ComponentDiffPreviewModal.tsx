'use client';

import { useEffect, useMemo } from 'react';
import { Render, type Config, type Data } from '@puckeditor/core';
import { X, Check, AlertTriangle } from 'lucide-react';
import type { SpikePuckProps } from './puck-config';

type SpikeData = Data<SpikePuckProps>;

type ComponentInstance = SpikeData['content'][number];

interface Props {
  /** Puck config — same instance used by the editor so render functions match. */
  config: Config<SpikePuckProps>;
  /** Component as it currently exists in the page. */
  current: ComponentInstance;
  /** Proposed AI-rewritten props for the same component. */
  proposed: ComponentInstance;
  /** Edit-distance 0-100 — visual cue for how aggressive the AI change is. */
  editDistance: number;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Side-by-side dual-render diff preview for component-level AI edits.
 *
 * Renders the same Puck component twice with `<Render>` (read-only): once
 * with current props, once with proposed props. The shared `config` ensures
 * both panels go through identical render functions, so the only visual
 * delta is the prop-level change.
 *
 * Edit-distance badge surfaces how aggressive the AI rewrite is — > 70%
 * shows a warning banner so users review carefully.
 */
export function ComponentDiffPreviewModal({
  config,
  current,
  proposed,
  editDistance,
  onAccept,
  onReject,
}: Props) {
  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onReject]);

  const currentData: SpikeData = useMemo(
    () => ({ root: { props: {} }, content: [current] }),
    [current],
  );
  const proposedData: SpikeData = useMemo(
    () => ({ root: { props: {} }, content: [proposed] }),
    [proposed],
  );

  const highEditDistance = editDistance > 70;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onReject}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
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
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                margin: 0,
                color: '#0f172a',
              }}
            >
              AI-voorstel — vergelijk huidig vs aanbevolen
            </h2>
            <p
              style={{
                fontSize: '13px',
                margin: '4px 0 0',
                color: '#64748b',
              }}
            >
              AI wants to change {editDistance}% of the text
            </p>
          </div>
          <button
            type="button"
            onClick={onReject}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 6,
              color: '#64748b',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* High edit-distance warning */}
        {highEditDistance ? (
          <div
            style={{
              padding: '10px 24px',
              background: '#fef3c7',
              borderBottom: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#92400e',
              fontSize: '13px',
            }}
          >
            <AlertTriangle size={16} />
            <span>
              Grote wijziging — review zorgvuldig. AI verandert &gt;70% van de
              tekst.
            </span>
          </div>
        ) : null}

        {/* Dual-render panes */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            background: '#e2e8f0',
            overflow: 'auto',
          }}
        >
          <div style={{ background: '#ffffff', padding: '16px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '12px',
                letterSpacing: '0.5px',
              }}
            >
              Huidig
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <Render config={config} data={currentData} />
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '16px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#0891b2',
                textTransform: 'uppercase',
                marginBottom: '12px',
                letterSpacing: '0.5px',
              }}
            >
              Voorgesteld door AI
            </div>
            <div style={{ border: '1px solid #67e8f9', borderRadius: '8px', overflow: 'hidden' }}>
              <Render config={config} data={proposedData} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onReject}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Afwijzen
          </button>
          <button
            type="button"
            onClick={onAccept}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Check size={16} />
            Accepteren
          </button>
        </div>
      </div>
    </div>
  );
}
