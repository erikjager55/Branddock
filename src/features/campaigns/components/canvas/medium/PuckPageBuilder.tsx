'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Puck, Render, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { Sparkles, Loader2, Lock, Unlock, Wand2, Pencil, FileText, Layout, X } from 'lucide-react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { PlatformPreviewProps } from '../../../types/canvas.types';
import { buildSpikePuckConfig, type SpikePuckProps } from './puck-config';
import { variantToPuckData } from './variant-to-puck-data';
import { ComponentDiffPreviewModal } from './ComponentDiffPreviewModal';
import { PageDiffPreviewModal } from './PageDiffPreviewModal';
import {
  listInstructions,
  type AiInstructionId,
} from '@/lib/landing-pages/ai-edit-instructions';
import { isComponentLocked, toggleComponentLock } from '@/lib/landing-pages/component-lock';

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
 * Preview-first web-page builder for the 5 Puck-powered web-page types
 * (Phase 6.4b — 2026-05-24 refactor).
 *
 * Default view = full-width `<Render>` of the page so the user immediately
 * sees the generated result rather than the editor chrome. AI buttons + lock-
 * toggle + page-level actions live in fixed toolbars above + below the render.
 *
 * Drag-drop reorder + Blocks-library + Puck sidebar are reachable via the
 * "Bewerk layout" button which opens a fullscreen `<Puck>` editor modal —
 * power-user feature, not the default-flow distraction.
 *
 * Data-flow + persistence (unchanged from Phase 1+6.1):
 *  - Hydrate from `contextStack.puckData` (server-loaded via
 *    `assembleCanvasContext`).
 *  - Seed via {@link variantToPuckData} on first mount when nothing
 *    persisted yet (uses Step 2 variant-content + brand context).
 *  - Persist via debounced 1500ms PATCH to /api/studio/[deliverableId].
 *
 * Phase 6.5+ TODO: click-to-select on rendered components → AI-toolbar
 * context-aware. For 6.4b minimum the target-picker stays on "first editable
 * component" (BrandHero by template-default).
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
  const [editorOpen, setEditorOpen] = useState(false);

  type PagePending = {
    current: SpikeData;
    proposed: SpikeData;
    scoreBefore: number;
    scoreProjected: number;
    threshold: number;
    source: 'auto-iterate' | 'strict-rewrite';
  };
  const [pagePending, setPagePending] = useState<PagePending | null>(null);
  const [pageBusy, setPageBusy] = useState<null | 'auto-iterate' | 'strict-rewrite' | 'generate-page'>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [promptModal, setPromptModal] = useState<null | 'strict-rewrite' | 'generate-page'>(null);
  const [promptValue, setPromptValue] = useState('');

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

  const targetIndex = useMemo(() => {
    const editable = new Set(['BrandHero', 'BrandCTA', 'Testimonial', 'RichText', 'Footer']);
    return puckData.content.findIndex((c) => editable.has(c.type));
  }, [puckData]);

  const targetComponent = targetIndex >= 0 ? puckData.content[targetIndex] : null;
  const targetComponentId = (targetComponent?.props as { id?: string } | undefined)?.id ?? '';
  const targetLocked = targetComponent
    ? isComponentLocked(puckData as never, targetComponentId)
    : false;

  const handleAiEdit = useCallback(
    async (instructionId: AiInstructionId) => {
      setAiError(null);
      if (!targetComponent || targetIndex < 0) {
        setAiError('Geen text-editable component op de pagina');
        return;
      }
      if (targetLocked) {
        setAiError('Component is locked — unlock eerst');
        return;
      }
      setAiBusy(true);
      try {
        const res = await fetch('/api/landing-pages/component-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            componentType: targetComponent.type,
            currentProps: targetComponent.props,
            instructionId,
            locked: targetLocked,
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
        const proposedComponent = {
          ...targetComponent,
          props: { ...targetComponent.props, ...json.proposedProps },
        } as ComponentInstance;
        setPendingEdit({
          componentIndex: targetIndex,
          current: targetComponent,
          proposed: proposedComponent,
          editDistance: json.editDistance,
        });
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'AI-edit onbekende fout');
      } finally {
        setAiBusy(false);
      }
    },
    [contextStack, targetComponent, targetIndex, targetLocked],
  );

  const handleToggleLock = useCallback(() => {
    if (!targetComponentId) return;
    const nextData = toggleComponentLock(puckData as never, targetComponentId) as SpikeData;
    setPuckData(nextData);
    persistPuckData(nextData);
  }, [puckData, persistPuckData, targetComponentId]);

  const handleAutoIterate = useCallback(async () => {
    setPageError(null);
    setPageBusy('auto-iterate');
    try {
      const res = await fetch('/api/landing-pages/auto-iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puckData,
          deliverableId,
          brandVoiceTone: contextStack?.brand?.brandToneOfVoice ?? null,
          brandName: contextStack?.brand?.brandName ?? null,
        }),
      });
      const json = (await res.json()) as
        | { status: 'skipped'; reason: string; score: number; threshold: number }
        | { status: 'proposal'; score: number; scoreProjected: number; threshold: number; proposedPuckData: SpikeData }
        | { status: 'error'; error: string };
      if (json.status === 'skipped') {
        setPageError(`Page passeert al de kwaliteitsdrempel (${json.score}/${json.threshold})`);
        return;
      }
      if (json.status === 'error') {
        setPageError(json.error);
        return;
      }
      setPagePending({
        current: puckData,
        proposed: json.proposedPuckData,
        scoreBefore: json.score,
        scoreProjected: json.scoreProjected,
        threshold: json.threshold,
        source: 'auto-iterate',
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'auto-iterate failed');
    } finally {
      setPageBusy(null);
    }
  }, [puckData, contextStack, deliverableId]);

  const handleStrictRewriteSubmit = useCallback(async (instruction: string) => {
    setPageError(null);
    setPageBusy('strict-rewrite');
    try {
      const res = await fetch('/api/landing-pages/strict-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puckData,
          instruction,
          brandVoiceTone: contextStack?.brand?.brandToneOfVoice ?? null,
          brandName: contextStack?.brand?.brandName ?? null,
        }),
      });
      const json = (await res.json()) as
        | { status: 'proposal'; score: number; scoreProjected: number; threshold: number; proposedPuckData: SpikeData }
        | { status: 'error'; error: string };
      if (json.status === 'error') {
        setPageError(json.error);
        return;
      }
      setPagePending({
        current: puckData,
        proposed: json.proposedPuckData,
        scoreBefore: json.score,
        scoreProjected: json.scoreProjected,
        threshold: json.threshold,
        source: 'strict-rewrite',
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'strict-rewrite failed');
    } finally {
      setPageBusy(null);
    }
  }, [puckData, contextStack]);

  const handleGeneratePageSubmit = useCallback(async (prompt: string) => {
    if (!deliverableId) {
      setPageError('Geen deliverableId — kan generate niet starten');
      return;
    }
    setPageError(null);
    setPageBusy('generate-page');
    try {
      const res = await fetch('/api/landing-pages/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliverableId, prompt }),
      });
      const json = (await res.json()) as { puckData?: SpikeData; error?: string };
      if (!res.ok || !json.puckData) {
        setPageError(json.error ?? 'generate-page failed');
        return;
      }
      setPuckData(json.puckData);
      persistPuckData(json.puckData);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'generate-page failed');
    } finally {
      setPageBusy(null);
    }
  }, [deliverableId, persistPuckData]);

  const handlePageAccept = useCallback(
    (merged: SpikeData) => {
      setPuckData(merged);
      persistPuckData(merged);
      setPagePending(null);
    },
    [persistPuckData],
  );

  const handlePromptSubmit = useCallback(() => {
    const value = promptValue.trim();
    if (value.length < 3) return;
    const mode = promptModal;
    setPromptModal(null);
    setPromptValue('');
    if (mode === 'strict-rewrite') {
      void handleStrictRewriteSubmit(value);
    } else if (mode === 'generate-page') {
      void handleGeneratePageSubmit(value);
    }
  }, [promptValue, promptModal, handleStrictRewriteSubmit, handleGeneratePageSubmit]);

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
      {/* AI-toolbar — bovenkant, component-level edits */}
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
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
          AI-bewerkingen{targetComponent ? ` — ${targetComponent.type}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {aiError ? (
            <span style={{ fontSize: 12, color: '#dc2626', marginRight: 4 }}>{aiError}</span>
          ) : null}
          {listInstructions().map((instruction) => (
            <button
              key={instruction.id}
              type="button"
              onClick={() => handleAiEdit(instruction.id)}
              disabled={aiBusy || targetLocked || !targetComponent}
              title={instruction.labelNl ?? instruction.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #0f172a',
                background: aiBusy ? '#f1f5f9' : '#0f172a',
                color: aiBusy ? '#64748b' : '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: aiBusy || targetLocked ? 'not-allowed' : 'pointer',
                opacity: targetLocked || !targetComponent ? 0.5 : 1,
              }}
            >
              {aiBusy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {instruction.labelNl ?? instruction.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleToggleLock}
            disabled={!targetComponent}
            title={targetLocked ? 'Unlock component' : 'Lock component'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${targetLocked ? '#dc2626' : '#cbd5e1'}`,
              background: targetLocked ? '#fef2f2' : '#ffffff',
              color: targetLocked ? '#dc2626' : '#475569',
              fontSize: 12,
              fontWeight: 600,
              cursor: targetComponent ? 'pointer' : 'not-allowed',
            }}
          >
            {targetLocked ? <Lock size={12} /> : <Unlock size={12} />}
            {targetLocked ? 'Locked' : 'Unlocked'}
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            title="Open drag-and-drop layout-editor (componenten herordenen, toevoegen, verwijderen)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #0891b2',
              background: '#ffffff',
              color: '#0891b2',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            <Layout size={12} />
            Bewerk layout
          </button>
        </div>
      </div>

      {/* Full-width page render — preview-first (Phase 6.4b) */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        <Render config={config} data={puckData} />
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

      {/* Page-level toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          padding: '10px 14px',
          background: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
          Pagina-acties (AI op hele page)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {pageError ? (
            <span style={{ fontSize: 12, color: '#dc2626' }}>{pageError}</span>
          ) : null}
          <button
            type="button"
            onClick={handleAutoIterate}
            disabled={pageBusy !== null}
            title="Verbeter automatisch wanneer score &lt; threshold"
            style={pageButtonStyle(pageBusy === 'auto-iterate')}
          >
            {pageBusy === 'auto-iterate' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            Auto-iterate
          </button>
          <button
            type="button"
            onClick={() => { setPromptModal('strict-rewrite'); setPromptValue(''); }}
            disabled={pageBusy !== null}
            title="Herschrijf de hele page met jouw instructie"
            style={pageButtonStyle(pageBusy === 'strict-rewrite')}
          >
            {pageBusy === 'strict-rewrite' ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
            Strict-rewrite
          </button>
          <button
            type="button"
            onClick={() => { setPromptModal('generate-page'); setPromptValue(''); }}
            disabled={pageBusy !== null}
            title="Bouw page vanaf nul met een prompt — overschrijft huidige content"
            style={pageButtonStyle(pageBusy === 'generate-page')}
          >
            {pageBusy === 'generate-page' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Generate from prompt
          </button>
        </div>
      </div>

      {pagePending ? (
        <PageDiffPreviewModal
          config={config}
          current={pagePending.current}
          proposed={pagePending.proposed}
          scoreBefore={pagePending.scoreBefore}
          scoreProjected={pagePending.scoreProjected}
          threshold={pagePending.threshold}
          source={pagePending.source}
          onAccept={handlePageAccept}
          onReject={() => setPagePending(null)}
        />
      ) : null}

      {promptModal ? (
        <PromptInputModal
          title={
            promptModal === 'strict-rewrite'
              ? 'Strict-rewrite — instructie voor de hele page'
              : 'Generate from prompt — beschrijf de page'
          }
          placeholder={
            promptModal === 'strict-rewrite'
              ? 'Bijv. Maak alles 30% formeler'
              : 'Bijv. Landing page voor product-launch met persona Marit'
          }
          value={promptValue}
          onChange={setPromptValue}
          onSubmit={handlePromptSubmit}
          onCancel={() => { setPromptModal(null); setPromptValue(''); }}
        />
      ) : null}

      {editorOpen ? (
        <FullscreenEditorModal
          config={config}
          data={puckData}
          onChange={handlePuckChange}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}

function pageButtonStyle(busy: boolean) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #0891b2',
    background: busy ? '#cffafe' : '#0891b2',
    color: busy ? '#0e7490' : '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
  } as const;
}

function PromptInputModal({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

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
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 560,
          padding: 24,
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 17, color: '#0f172a' }}>{title}</h2>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          style={{
            width: '100%',
            minHeight: 100,
            padding: 10,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={value.trim().length < 3}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: value.trim().length < 3 ? '#cbd5e1' : '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 13,
              cursor: value.trim().length < 3 ? 'not-allowed' : 'pointer',
            }}
          >
            Versturen
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Fullscreen modal that wraps the full `<Puck>` editor for drag-drop / Blocks-
 * library / properties access. Hidden behind the "Bewerk layout" button so the
 * preview-first default-view stays uncluttered.
 *
 * onChange propagates Puck-edits to the parent state (which also persists
 * via the 1500ms debounced save). Close button + ESC + backdrop click all
 * dismiss back to preview.
 */
function FullscreenEditorModal({
  config,
  data,
  onChange,
  onClose,
}: {
  config: ReturnType<typeof buildSpikePuckConfig>;
  data: SpikeData;
  onChange: (data: SpikeData) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#0f172a',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layout size={16} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Layout-editor</span>
          <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
            Sleep componenten · pas volgorde aan · klik X om terug naar preview
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten — terug naar preview"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <X size={14} />
          Sluit editor
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Puck config={config} data={data} onChange={onChange} />
      </div>
    </div>
  );
}
