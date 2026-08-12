'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Layout,
  Lock,
  Monitor,
  Plus,
  Redo2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { PageRender } from '@/lib/landing-pages/page-render';
import type { PageData as Data } from '@/lib/landing-pages/page-data';
import { SECTION_TYPE_IDS } from '@/lib/landing-pages/page-data';
import {
  addSection,
  applyStructureOperations,
  canRemoveSection,
  duplicateSection,
  moveSection,
  removeSection,
  setSectionProps,
  type EditableTree,
} from '@/lib/landing-pages/section-edit-tools';
import { isComponentLocked } from '@/lib/landing-pages/component-lock';
import {
  patternLabelFor,
  resolveSectionPatternKey,
  SECTION_PATTERN_PROP,
} from '@/lib/landing-pages/section-patterns';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { buildSpikePuckConfig, SpikePuckProps } from './puck-config';
import {
  addDefaultsForType,
  EDITOR_VIEWPORT_WIDTHS,
  fieldsToPanelModel,
  reorderOperations,
  sectionListLabel,
  type EditorViewport,
  type SectionRegistryMeta,
} from './section-editor-model';
import { SectionPropsPanel } from './SectionPropsPanel';

type SpikeData = Data<SpikePuckProps>;

/** Max diepte van de undo/redo-snapshot-stacks. */
const MAX_HISTORY = 50;

/**
 * Opeenvolgende commits op hetzélfde veld binnen dit venster delen één
 * undo-snapshot (typen = één undo-stap i.p.v. één per toetsaanslag).
 */
const EDIT_COALESCE_MS = 1000;

// section-edit-tools/component-lock werken op hun eigen losse tree-shapes;
// SpikeData is er structureel mee compatibel maar de generics zijn invariant
// — cast één keer op de grens, de kernel valideert runtime (zelfde patroon
// als PreviewEditingLayer).
type LockableTree = Parameters<typeof isComponentLocked>[0];
function asTree(data: SpikeData): EditableTree {
  return data as unknown as EditableTree;
}
function asData(tree: EditableTree): SpikeData {
  return tree as unknown as SpikeData;
}

function sectionIdOf(item: { props?: { id?: string } } | undefined): string | null {
  const id = item?.props?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * C2 — NL-label van het actieve layout-patroon voor de lijst-badge; null bij
 * 'default' (geen badge — alleen afwijkingen zijn het signaleren waard).
 */
function sectionPatternBadge(item: { type: string; props?: Record<string, unknown> }): string | null {
  const key = resolveSectionPatternKey(item.type, item.props?.[SECTION_PATTERN_PROP]);
  if (key === 'default') return null;
  return patternLabelFor(item.type, key) ?? key;
}

/** Ctrl/Cmd+Z mag native input-undo niet kapen — editable targets overslaan. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Bounding-box van een sectie: de `data-section-id`-wrapper is
 * `display:contents` (boxloos), dus we unionen de boxes van de directe
 * kinderen (zelfde aanpak als PreviewEditingLayer.sectionBoundingRect).
 */
function sectionUnionRect(
  sectionEl: Element,
): { top: number; left: number; right: number; bottom: number } | null {
  let rect: { top: number; left: number; right: number; bottom: number } | null = null;
  for (const child of Array.from(sectionEl.children)) {
    const r = child.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    rect = rect
      ? {
          top: Math.min(rect.top, r.top),
          left: Math.min(rect.left, r.left),
          right: Math.max(rect.right, r.right),
          bottom: Math.max(rect.bottom, r.bottom),
        }
      : { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
  }
  return rect;
}

export interface SectionEditorProps {
  config: ReturnType<typeof buildSpikePuckConfig>;
  data: SpikeData;
  /** Deliverable content-type (bv. 'landing-page') — stuurt de verplichte-sectie-guard. */
  contentType: string | null;
  onChange: (next: SpikeData) => void;
  onClose: () => void;
}

/**
 * Eigen fullscreen sectie-editor (E2, ADR 2026-08-07-puck-exit-sectie-editor)
 * — vervangt de `<Puck>`-FullscreenEditorModal. Drie kolommen:
 *
 *  - **Links**: verticale sectie-lijst (type + eerste tekstregel), reorder
 *    via pijlen én native HTML5 drag-and-drop (platte lijst — geen dnd-kit-
 *    dependency nodig), dupliceer/verwijder via de section-edit-tools-kernel
 *    (guards; weiger-redenen inline getoond) en "Sectie toevoegen" met alle
 *    registry-types + default-props uit de template-helpers-factories.
 *  - **Midden**: live `<PageRender>`-preview (sectie-markers aan) met
 *    click-to-select via event-delegation op `data-section-id`, viewport-
 *    breedte (desktop/768/375) en een selectie-ring om de actieve sectie.
 *  - **Rechts**: props-paneel gerenderd uit de `fields`-metadata van het
 *    component-type (SectionPropsPanel); gelockte secties read-only.
 *
 * Undo/redo: snapshot-stack (max 50) over de editor-sessie met
 * Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z. Bewust een simpele twee-stacks-variant
 * zónder restore-forward-checkpoints: elke mutatie hier is een kleine,
 * deterministische gebruikersactie (geen AI-batches), dus lineaire
 * undo-geschiedenis dekt de sessie; checkpoint-per-AI-mutatie leeft in de
 * diff-modals van het prompt-pad, niet in deze editor.
 *
 * Alle mutaties lopen door `onChange` (= handlePuckChange in PuckPageBuilder,
 * bestaand debounced-autosave-pad) — de editor persisteert zelf niets.
 * Portal + inline fixed-positioning + max z-index: zelfde stacking-context-
 * rationale als de oude modal (app-chrome met z-30 sticky nav).
 */
export function SectionEditor({ config, data, contentType, onChange, onClose }: SectionEditorProps) {
  const { t } = useTranslation('campaigns-canvas-medium');
  const contextStack = useCanvasStore((s) => s.contextStack);
  const registry = useMemo(() => config.components as unknown as SectionRegistryMeta, [config]);

  // Altijd-actuele spiegel van data voor handlers die elkaar snel opvolgen
  // (zelfde patroon als dataRef in PreviewEditingLayer).
  const dataRef = useRef<SpikeData>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [selectedId, setSelectedId] = useState<string | null>(
    () => sectionIdOf(data.content[0]),
  );
  const [viewport, setViewport] = useState<EditorViewport>('desktop');
  const [addOpen, setAddOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ undo: SpikeData[]; redo: SpikeData[] }>({
    undo: [],
    redo: [],
  });
  const lastEditRef = useRef<{ key: string; at: number } | null>(null);
  const previewInnerRef = useRef<HTMLDivElement | null>(null);

  // ── History + mutatie-kern ──────────────────────────────────────────
  const applyChange = useCallback(
    (next: SpikeData, editKey: string | null) => {
      const prev = dataRef.current;
      const now = Date.now();
      const last = lastEditRef.current;
      const coalesce =
        editKey !== null && last !== null && last.key === editKey && now - last.at < EDIT_COALESCE_MS;
      lastEditRef.current = editKey ? { key: editKey, at: now } : null;
      setHistory((h) => ({
        undo: coalesce ? h.undo : [...h.undo, prev].slice(-MAX_HISTORY),
        redo: [],
      }));
      dataRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  const handleUndo = useCallback(() => {
    if (history.undo.length === 0) return;
    const snapshot = history.undo[history.undo.length - 1];
    const current = dataRef.current;
    lastEditRef.current = null;
    setHistory({
      undo: history.undo.slice(0, -1),
      redo: [...history.redo, current].slice(-MAX_HISTORY),
    });
    dataRef.current = snapshot;
    onChange(snapshot);
  }, [history, onChange]);

  const handleRedo = useCallback(() => {
    if (history.redo.length === 0) return;
    const snapshot = history.redo[history.redo.length - 1];
    const current = dataRef.current;
    lastEditRef.current = null;
    setHistory({
      undo: [...history.undo, current].slice(-MAX_HISTORY),
      redo: history.redo.slice(0, -1),
    });
    dataRef.current = snapshot;
    onChange(snapshot);
  }, [history, onChange]);

  // ── Toetsenbord: ESC sluit (drawer eerst), Cmd/Ctrl+Z undo/redo ─────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (addOpen) setAddOpen(false);
        else onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addOpen, onClose, handleUndo, handleRedo]);

  // ── Structurele operaties (kernel) ──────────────────────────────────
  const handleMove = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      setListError(null);
      const result = moveSection(asTree(dataRef.current), sectionId, direction);
      if (result.ok) applyChange(asData(result.data), null);
    },
    [applyChange],
  );

  const handleDuplicate = useCallback(
    (sectionId: string) => {
      setListError(null);
      const result = duplicateSection(asTree(dataRef.current), sectionId);
      if (!result.ok) return;
      const next = asData(result.data);
      const originalIdx = next.content.findIndex((c) => sectionIdOf(c) === sectionId);
      applyChange(next, null);
      const copyId = sectionIdOf(next.content[originalIdx + 1]);
      if (copyId) setSelectedId(copyId);
    },
    [applyChange],
  );

  const handleRemove = useCallback(
    (sectionId: string, sectionType: string) => {
      const guard = canRemoveSection(asTree(dataRef.current), contentType, sectionId);
      if (!guard.ok) {
        setListError(
          guard.reasonCode === 'required'
            ? t('pageBuilder.sectionRemoveRequired', { type: guard.sectionType ?? sectionType })
            : t('pageBuilder.sectionRemoveLocked'),
        );
        return;
      }
      if (!window.confirm(t('pageBuilder.sectionRemoveConfirm', { type: sectionType }))) return;
      setListError(null);
      const idx = dataRef.current.content.findIndex((c) => sectionIdOf(c) === sectionId);
      const result = removeSection(asTree(dataRef.current), contentType, sectionId);
      if (!result.ok) return;
      const next = asData(result.data);
      applyChange(next, null);
      if (selectedId === sectionId) {
        setSelectedId(sectionIdOf(next.content[Math.min(idx, next.content.length - 1)]));
      }
    },
    [contentType, selectedId, applyChange, t],
  );

  const handleAdd = useCallback(
    (type: string) => {
      setListError(null);
      const props = addDefaultsForType(type, contextStack, registry[type]?.defaultProps);
      const current = dataRef.current;
      const afterSectionId = selectedId ?? sectionIdOf(current.content[current.content.length - 1]);
      const result = addSection(asTree(current), { type, props, afterSectionId });
      if (!result.ok) {
        setListError(t('pageBuilder.editor.addFailed'));
        return;
      }
      const prevIds = new Set(current.content.map((c) => sectionIdOf(c)));
      const next = asData(result.data);
      applyChange(next, null);
      const added = next.content.find((c) => !prevIds.has(sectionIdOf(c)));
      const addedId = sectionIdOf(added);
      if (addedId) setSelectedId(addedId);
      setAddOpen(false);
    },
    [contextStack, registry, selectedId, applyChange, t],
  );

  const handleDropReorder = useCallback(
    (sectionId: string, toIndex: number) => {
      setListError(null);
      const ops = reorderOperations(dataRef.current.content, sectionId, toIndex);
      if (ops.length === 0) return;
      const result = applyStructureOperations(asTree(dataRef.current), contentType, ops);
      if (result.ok) applyChange(asData(result.data), null);
    },
    [contentType, applyChange],
  );

  const handlePropsCommit = useCallback(
    (key: string, value: unknown) => {
      if (!selectedId) return;
      const result = setSectionProps(asTree(dataRef.current), selectedId, { [key]: value });
      if (result.ok) applyChange(asData(result.data), `${selectedId}.${key}`);
    },
    [selectedId, applyChange],
  );

  // ── Selectie: preview-klik (event-delegation) + lijst-klik ──────────
  const scrollPreviewTo = useCallback((sectionId: string) => {
    const el = previewInnerRef.current?.querySelector(
      `[data-section-id="${CSS.escape(sectionId)}"]`,
    );
    el?.firstElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePreviewClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!(e.target instanceof Element)) return;
    // De preview mag nooit wegnavigeren — links inert maken.
    if (e.target.closest('a')) e.preventDefault();
    const id = e.target.closest('[data-section-id]')?.getAttribute('data-section-id');
    if (!id) return;
    setSelectedId(id);
    document
      .getElementById(`se-list-item-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const selectFromList = useCallback(
    (sectionId: string) => {
      setSelectedId(sectionId);
      scrollPreviewTo(sectionId);
    },
    [scrollPreviewTo],
  );

  // ── Selectie-ring in de preview ──────────────────────────────────────
  // Gepositioneerd binnen de relative preview-wrapper → scrollt mee zonder
  // scroll-listener; alleen her-meten bij data/selectie/viewport/resize.
  const [ring, setRing] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const refreshRing = useCallback(() => {
    const inner = previewInnerRef.current;
    const sectionEl =
      inner && selectedId
        ? inner.querySelector(`[data-section-id="${CSS.escape(selectedId)}"]`)
        : null;
    const rect = sectionEl ? sectionUnionRect(sectionEl) : null;
    if (!inner || !rect) {
      setRing(null);
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    setRing({
      top: rect.top - innerRect.top,
      left: rect.left - innerRect.left,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
    });
  }, [selectedId]);

  useEffect(() => {
    const raf = requestAnimationFrame(refreshRing);
    return () => cancelAnimationFrame(raf);
  }, [refreshRing, data, viewport]);

  useEffect(() => {
    window.addEventListener('resize', refreshRing);
    return () => window.removeEventListener('resize', refreshRing);
  }, [refreshRing]);

  // ── Afgeleide render-data ────────────────────────────────────────────
  const content = useMemo(
    () => (Array.isArray(data.content) ? data.content : []),
    [data.content],
  );
  const selectedIndex = content.findIndex((c) => sectionIdOf(c) === selectedId);
  const selected = selectedIndex >= 0 ? content[selectedIndex] : null;
  const selectedLocked = selectedId
    ? isComponentLocked(data as unknown as LockableTree, selectedId)
    : false;
  const panelFields = useMemo(
    () => (selected ? fieldsToPanelModel(registry[selected.type]?.fields) : []),
    [registry, selected],
  );
  const typeLabelFor = useCallback(
    (type: string) => t(`pageBuilder.editor.types.${type}`, { defaultValue: type }),
    [t],
  );
  const viewportWidth = EDITOR_VIEWPORT_WIDTHS[viewport];

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}
    >
      <EditorTopbar
        canUndo={history.undo.length > 0}
        canRedo={history.redo.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        viewport={viewport}
        onViewport={setViewport}
        onClose={onClose}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* LINKS — sectie-lijst (w-72 ontbreekt in de gecompileerde CSS → inline width) */}
        <aside
          className="flex flex-col border-r border-gray-200 bg-gray-50"
          style={{ width: 288, flexShrink: 0, position: 'relative' }}
        >
          <div className="border-b border-gray-200 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('pageBuilder.editor.sectionsTitle')}
            </span>
          </div>
          <SectionList
            content={content}
            selectedId={selectedId}
            typeLabelFor={typeLabelFor}
            onSelect={selectFromList}
            onMove={handleMove}
            onDuplicate={handleDuplicate}
            onRemove={handleRemove}
            onDropReorder={handleDropReorder}
          />
          {listError ? (
            <p className="mx-2 mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
              {listError}
            </p>
          ) : null}
          <div className="border-t border-gray-200 p-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              {t('pageBuilder.editor.addSection')}
            </button>
          </div>
          {addOpen ? (
            <AddSectionDrawer
              typeLabelFor={typeLabelFor}
              onPick={handleAdd}
              onClose={() => setAddOpen(false)}
            />
          ) : null}
        </aside>

        {/* MIDDEN — live preview */}
        <div
          role="region"
          aria-label={t('pageBuilder.editor.previewAria')}
          style={{ flex: 1, minWidth: 0, overflow: 'auto', background: '#f3f4f6', padding: 24 }}
          onClick={handlePreviewClick}
        >
          <div
            ref={previewInnerRef}
            style={{
              position: 'relative',
              margin: '0 auto',
              background: '#ffffff',
              maxWidth: viewportWidth ?? undefined,
              boxShadow: viewportWidth ? '0 1px 8px rgba(0,0,0,0.10)' : undefined,
              borderRadius: viewportWidth ? 8 : undefined,
              overflow: viewportWidth ? 'hidden' : undefined,
            }}
          >
            <PageRender config={config} data={data} />
            {ring ? (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: ring.top,
                  left: ring.left,
                  width: ring.width,
                  height: ring.height,
                  border: '2px solid #1FD1B2',
                  borderRadius: 4,
                  boxShadow: '0 0 0 4px rgba(31, 209, 178, 0.15)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>
        </div>

        {/* RECHTS — props-paneel */}
        <aside
          className="border-l border-gray-200 bg-white"
          style={{ width: 320, flexShrink: 0, minHeight: 0 }}
        >
          <SectionPropsPanel
            section={selected as { type: string; props: Record<string, unknown> } | null}
            typeLabel={selected ? typeLabelFor(selected.type) : ''}
            fields={panelFields}
            locked={selectedLocked}
            onCommit={handlePropsCommit}
          />
        </aside>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Branddock-topbar: titel + hint links; undo/redo, viewport-toggle en
 * "Editor sluiten" rechts (zelfde chrome-positie als de oude modal).
 */
function EditorTopbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewport,
  onViewport,
  onClose,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewport: EditorViewport;
  onViewport: (v: EditorViewport) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  const viewports: Array<{ id: EditorViewport; icon: LucideIcon; label: string }> = [
    { id: 'desktop', icon: Monitor, label: t('pageBuilder.editor.viewportDesktop') },
    { id: 'tablet', icon: Tablet, label: t('pageBuilder.editor.viewportTablet') },
    { id: 'mobile', icon: Smartphone, label: t('pageBuilder.editor.viewportMobile') },
  ];
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Layout className="h-4 w-4 shrink-0 text-gray-600" />
        <span className="text-sm font-semibold text-gray-900">{t('pageBuilder.layoutEditor')}</span>
        <span className="ml-2 truncate text-xs text-gray-500">{t('pageBuilder.editor.hint')}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
          <TopbarIconButton
            icon={Undo2}
            label={t('pageBuilder.editor.undo')}
            onClick={onUndo}
            disabled={!canUndo}
          />
          <TopbarIconButton
            icon={Redo2}
            label={t('pageBuilder.editor.redo')}
            onClick={onRedo}
            disabled={!canRedo}
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
          {viewports.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={viewport === id}
              onClick={() => onViewport(id)}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                viewport === id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pageBuilder.closeEditorAria')}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 transition-opacity"
        >
          <X className="h-4 w-4" />
          {t('pageBuilder.closeEditor')}
        </button>
      </div>
    </div>
  );
}

function TopbarIconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

type SectionInstance = SpikeData['content'][number];

/**
 * Verticale sectie-lijst met native HTML5 drag-and-drop (drop = de sectie
 * landt op de index van het doel-item) plus pijl-/dupliceer-/verwijder-
 * knoppen per item. Native `draggable` volstaat voor een platte lijst —
 * bewust geen dnd-kit-dependency (ADR: exit betekent minder vendor, niet meer).
 */
function SectionList({
  content,
  selectedId,
  typeLabelFor,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
  onDropReorder,
}: {
  content: ReadonlyArray<SectionInstance>;
  selectedId: string | null;
  typeLabelFor: (type: string) => string;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string, type: string) => void;
  onDropReorder: (id: string, toIndex: number) => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const resetDrag = () => {
    setDraggedId(null);
    setDropIndex(null);
  };

  if (content.length === 0) {
    return (
      <div className="flex-1 p-4">
        <p className="text-xs text-gray-400">{t('pageBuilder.editor.emptyList')}</p>
      </div>
    );
  }

  return (
    <ul className="flex-1 space-y-1 overflow-y-auto p-2" style={{ minHeight: 0 }}>
      {content.map((item, index) => {
        const id = sectionIdOf(item) ?? `${item.type}-${index}`;
        const { preview } = sectionListLabel(item as { type: string; props?: Record<string, unknown> });
        // C2 — badge bij een niet-default layout-patroon (leesbaarheid).
        const patternBadge = sectionPatternBadge(item as { type: string; props?: Record<string, unknown> });
        const isSelected = id === selectedId;
        const isDropTarget = dropIndex === index && draggedId !== null && draggedId !== id;
        return (
          <li
            key={id}
            id={`se-list-item-${id}`}
            draggable
            onDragStart={(e) => {
              setDraggedId(id);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', id);
            }}
            onDragOver={(e) => {
              if (!draggedId || draggedId === id) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedId) onDropReorder(draggedId, index);
              resetDrag();
            }}
            onDragEnd={resetDrag}
            className={`group rounded-lg border transition-colors ${
              isSelected
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-transparent bg-white hover:border-gray-200'
            }`}
            style={{
              opacity: draggedId === id ? 0.5 : 1,
              outline: isDropTarget ? '2px dashed #1FD1B2' : undefined,
              outlineOffset: isDropTarget ? 2 : undefined,
            }}
          >
            <div className="flex items-start gap-1.5 p-2">
              <span
                title={t('pageBuilder.editor.dragToReorder')}
                className="mt-0.5 shrink-0 text-gray-300 group-hover:text-gray-400"
                style={{ cursor: 'grab' }}
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={`truncate text-xs font-semibold ${
                      isSelected ? 'text-emerald-700' : 'text-gray-700'
                    }`}
                  >
                    {typeLabelFor(item.type)}
                  </span>
                  {patternBadge ? (
                    <span
                      title={t('pageBuilder.patterns.badgeTitle', { label: patternBadge })}
                      className="shrink-0 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700"
                    >
                      {patternBadge}
                    </span>
                  ) : null}
                </span>
                {preview ? (
                  <span className="block truncate text-[11px] text-gray-400">{preview}</span>
                ) : null}
              </button>
            </div>
            <div className="flex items-center gap-0.5 px-2 pb-1.5">
              <ListIconButton
                icon={ArrowUp}
                label={t('pageBuilder.sectionMoveUp')}
                onClick={() => onMove(id, 'up')}
                disabled={index === 0}
              />
              <ListIconButton
                icon={ArrowDown}
                label={t('pageBuilder.sectionMoveDown')}
                onClick={() => onMove(id, 'down')}
                disabled={index === content.length - 1}
              />
              <ListIconButton
                icon={Copy}
                label={t('pageBuilder.sectionDuplicate')}
                onClick={() => onDuplicate(id)}
              />
              <ListIconButton
                icon={Trash2}
                label={t('pageBuilder.sectionRemove')}
                onClick={() => onRemove(id, item.type)}
                tone="danger"
              />
              {isComponentLockedSafe(content, id) ? (
                <span title={t('pageBuilder.editor.lockedNotice')} className="ml-auto text-amber-500">
                  <Lock className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Lock-check op de lijst-shape zonder de hele tree door te geven. */
function isComponentLockedSafe(
  content: ReadonlyArray<SectionInstance>,
  sectionId: string,
): boolean {
  return isComponentLocked({ content } as unknown as LockableTree, sectionId);
}

function ListIconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Drawer over de linkerkolom: alle registry-sectie-types (SECTION_TYPE_IDS)
 * met NL-labels; klik voegt toe ná de geselecteerde sectie.
 */
function AddSectionDrawer({
  typeLabelFor,
  onPick,
  onClose,
}: {
  typeLabelFor: (type: string) => string;
  onPick: (type: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  return (
    <div
      className="flex flex-col bg-white"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('pageBuilder.editor.addSectionTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pageBuilder.editor.addSectionClose')}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2" style={{ minHeight: 0 }}>
        {SECTION_TYPE_IDS.map((type) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => onPick(type)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-teal-200 hover:bg-teal-50"
            >
              <span className="block text-xs font-semibold text-gray-700">{typeLabelFor(type)}</span>
              <span className="block text-[11px] text-gray-400">{type}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
