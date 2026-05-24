'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Puck, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Sparkles, Loader2 } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { buildSpikePuckConfig, type SpikePuckProps } from './puck-config';
import { variantToPuckData } from './variant-to-puck-data';
import { ComponentDiffPreviewModal } from './ComponentDiffPreviewModal';

type SpikeData = Data<SpikePuckProps>;
type ComponentInstance = SpikeData['content'][number];

interface PendingEdit {
  componentIndex: number;
  current: ComponentInstance;
  proposed: ComponentInstance;
  editDistance: number;
}

const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * Puck-based visual editor mounted as the Step 3 Medium-renderer for the 5
 * web-page content-types (landing-page / product-page / faq-page /
 * comparison-page / microsite). Drop-in for `LandingPagePreview` via the
 * `CONTENT_TYPE_PREVIEW_OVERRIDE` map in `preview-map.ts`.
 *
 * Data-flow (Phase 1 minimum):
 *  - Hydrate from `contextStack.puckData` (assembled server-side from
 *    `deliverable.settings.puckData` in `assembleCanvasContext`).
 *  - Seed via {@link variantToPuckData} on first mount when nothing is
 *    persisted yet — uses Step 2 variant output + brand context.
 *  - Persist via debounced PATCH to `/api/studio/[deliverableId]` with a
 *    `{ settings: { puckData } }` payload (1500ms debounce). The studio
 *    route shallow-merges existing settings so other keys stay intact.
 *
 * AI-edit (Laag 2 in edit-paradigma): the "Maak hero korter" button posts
 * to `/api/landing-pages/component-edit`, opens a side-by-side diff-preview
 * modal, and applies the proposal only on explicit accept (Optie B —
 * always diff-preview).
 *
 * Phase 2+ TODO: move puckData to a dedicated Zustand slice with proper
 * modified-flag handling, extend AI-edit menu with more prompts + lock-toggle,
 * add page-level auto-iterate trigger.
 */
export function PuckPageBuilder({
  previewContent,
  isGenerating,
}: PlatformPreviewProps) {
  const contextStack = useCanvasStore((s) => s.contextStack);
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const hydratedPuckData = (contextStack?.puckData ?? null) as SpikeData | null;

  const config = useMemo(() => buildSpikePuckConfig(contextStack), [contextStack]);

  // Seed once: prefer hydrated data from server, fall back to variant-derived seed.
  const initialData = useMemo<SpikeData>(() => {
    if (
      hydratedPuckData &&
      Array.isArray(hydratedPuckData.content) &&
      hydratedPuckData.content.length > 0
    ) {
      return hydratedPuckData;
    }
    return variantToPuckData(previewContent, contextStack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [puckData, setPuckData] = useState<SpikeData>(initialData);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPuckData = useCallback(
    (data: SpikeData) => {
      if (!deliverableId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/studio/${deliverableId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { puckData: data } }),
        }).catch((err) => {
          console.warn('[PuckPageBuilder] auto-save failed', err);
        });
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [deliverableId],
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const handlePuckChange = useCallback(
    (data: SpikeData) => {
      setPuckData(data);
      persistPuckData(data);
    },
    [persistPuckData],
  );

  const handleShortenHero = useCallback(async () => {
    setAiError(null);
    const current = puckData.content.find((c) => c.type === 'BrandHero');
    if (!current) {
      setAiError('Geen BrandHero op de pagina om te bewerken');
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch('/api/landing-pages/component-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentType: current.type,
          currentProps: current.props,
          instruction: 'Maak de headline en sub korter en directer.',
          brandVoiceTone: contextStack?.brand?.brandToneOfVoice ?? null,
          brandName: contextStack?.brand?.brandName ?? null,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`AI-edit failed: ${res.status} ${txt}`);
      }
      const json = (await res.json()) as {
        proposedProps: Record<string, string>;
        editDistance: number;
      };
      const idx = puckData.content.findIndex((c) => c.type === 'BrandHero');
      if (idx < 0) {
        setAiError('BrandHero verdween tijdens AI-call');
        return;
      }
      const sourceComponent = puckData.content[idx];
      const proposedComponent = {
        ...sourceComponent,
        props: { ...sourceComponent.props, ...json.proposedProps },
      } as ComponentInstance;
      setPendingEdit({
        componentIndex: idx,
        current: sourceComponent,
        proposed: proposedComponent,
        editDistance: json.editDistance,
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI-edit onbekende fout');
    } finally {
      setAiBusy(false);
    }
  }, [contextStack, puckData]);

  const handleAcceptEdit = useCallback(() => {
    if (!pendingEdit) return;
    const nextContent = [...puckData.content];
    nextContent[pendingEdit.componentIndex] = pendingEdit.proposed;
    const nextData = { ...puckData, content: nextContent };
    setPuckData(nextData);
    persistPuckData(nextData);
    setPendingEdit(null);
  }, [pendingEdit, puckData, persistPuckData]);

  if (isGenerating) {
    return (
      <div
        style={{
          height: 480,
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: 14,
        }}
      >
        Wachten op variant-generatie…
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '10px 14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          Web-page builder (Phase 1 — alleen BrandHero + BrandCTA)
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {aiError ? (
            <span style={{ fontSize: 12, color: '#dc2626' }}>{aiError}</span>
          ) : null}
          <button
            type="button"
            onClick={handleShortenHero}
            disabled={aiBusy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #0f172a',
              background: aiBusy ? '#f1f5f9' : '#0f172a',
              color: aiBusy ? '#64748b' : '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: aiBusy ? 'wait' : 'pointer',
            }}
          >
            {aiBusy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {aiBusy ? 'Bezig…' : 'AI: maak hero korter'}
          </button>
        </div>
      </div>

      <div style={{ height: 720, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <Puck config={config} data={puckData} onChange={handlePuckChange} />
      </div>

      {pendingEdit ? (
        <ComponentDiffPreviewModal
          config={config}
          current={pendingEdit.current}
          proposed={pendingEdit.proposed}
          editDistance={pendingEdit.editDistance}
          onAccept={handleAcceptEdit}
          onReject={() => setPendingEdit(null)}
        />
      ) : null}
    </div>
  );
}
