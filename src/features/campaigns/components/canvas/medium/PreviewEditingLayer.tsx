'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  LayoutGrid,
  Loader2,
  Lock,
  Sparkles,
  Trash2,
  Unlock,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { PageData as Data } from '@/lib/landing-pages/page-data';
import type { SectionLibraryConfig } from '@/lib/landing-pages/section-config';
import {
  canRemoveSection,
  duplicateSection,
  moveSection,
  removeSection,
  setSectionProps,
  type EditableTree,
  type SectionEditResult,
} from '@/lib/landing-pages/section-edit-tools';
import { isComponentLocked, toggleComponentLock } from '@/lib/landing-pages/component-lock';
import { listInstructions, type AiInstruction } from '@/lib/landing-pages/ai-edit-instructions';
import { readPath } from '@/lib/landing-pages/puck-text-fields';
import {
  listPatternOptions,
  resolveSectionPatternKey,
  SECTION_PATTERN_PROP,
  sectionHasPatterns,
  sectionPatternItemCount,
  type SectionPatternOption,
} from '@/lib/landing-pages/section-patterns';
import { deepSet } from '@/lib/utils/deep-set';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import type { SpikePuckProps } from './puck-config';
import { findEditableTextPath, sectionContentIndex } from './preview-edit-matching';
import { ComponentDiffPreviewModal } from './ComponentDiffPreviewModal';

type SpikeData = Data<SpikePuckProps>;
type SectionInstance = SpikeData['content'][number];

/** Elementen die inline bewerkbare copy kunnen dragen (A3-selector). */
const TEXT_ELEMENT_SELECTOR = 'h1,h2,h3,h4,p,span,li,blockquote,a';

/** Props voor {@link PreviewEditingLayer} — spiegel van PuckPageBuilder-state. */
export interface PreviewEditingLayerProps {
  puckData: SpikeData;
  /** Deliverable content-type (bv. 'landing-page') — stuurt de verplichte-sectie-guard. */
  contentType: string | null;
  config: SectionLibraryConfig<SpikePuckProps>;
  deliverableId: string | null;
  /** Page-level lock (root.props.locked) — verbergt de toolbar en bevriest inline edit. */
  pageLocked: boolean;
  onChange: (next: SpikeData) => void;
  children: ReactNode;
}

// section-edit-tools/component-lock werken op hun eigen losse tree-shapes;
// SpikeData is er structureel mee compatibel maar de generics zijn invariant —
// cast één keer op de grens, de kernel valideert runtime.
type LockableTree = Parameters<typeof toggleComponentLock>[0];
function asTree(data: SpikeData): EditableTree {
  return data as unknown as EditableTree;
}
function asData(tree: EditableTree): SpikeData {
  return tree as unknown as SpikeData;
}

interface RectLike {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * Bounding-box van een sectie: de `data-section-id`-wrapper is
 * `display:contents` en heeft zélf geen box (getBoundingClientRect → 0×0),
 * dus we unionen de boxes van de directe kinderen.
 */
function sectionBoundingRect(sectionEl: Element): RectLike | null {
  let rect: RectLike | null = null;
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
  if (rect) return rect;
  const own = sectionEl.getBoundingClientRect();
  if (own.width === 0 && own.height === 0) return null;
  return { top: own.top, left: own.left, right: own.right, bottom: own.bottom };
}

/**
 * 0-based occurrence van de geklikte tekst-regio binnen de sectie, in
 * DOM-volgorde. Geneste elementen met dezelfde tekst (bv. h1 > span) vormen
 * één regio: querySelectorAll levert ancestors vóór descendants, dus nested
 * duplicaten van de laatst getelde regio worden overgeslagen.
 */
function domTextOccurrence(sectionEl: Element, clickedEl: Element, text: string): number {
  const needle = text.trim();
  let occurrence = 0;
  let regionRoot: Element | null = null;
  for (const el of Array.from(sectionEl.querySelectorAll(TEXT_ELEMENT_SELECTOR))) {
    if ((el.textContent ?? '').trim() !== needle) continue;
    if (el === clickedEl || el.contains(clickedEl) || clickedEl.contains(el)) return occurrence;
    if (regionRoot && regionRoot.contains(el)) continue;
    regionRoot = el;
    occurrence += 1;
  }
  return occurrence;
}

interface InlineEditSession {
  el: HTMLElement;
  path: string;
  /** Tree-waarde bij edit-start — guard tegen commits op een inmiddels gewijzigde tree. */
  original: string;
  /** DOM-textContent bij edit-start — restore-bron bij cancel. */
  originalDom: string;
  onKeyDown: (e: KeyboardEvent) => void;
  onBlur: () => void;
}

interface SectionProposal {
  sectionId: string;
  current: SectionInstance;
  proposed: SectionInstance;
  /** Herschreven props — strings óf herbouwde copy-arrays (FAQ-items e.d.). */
  proposedProps: Record<string, unknown>;
  editDistance: number;
}

/** B3 — anker voor element-level AI: het actieve inline-edit-veld. */
interface ElementAiTarget {
  /** Volledig tree-pad (`content[i].props.headline`). */
  path: string;
  /** Top-level propnaam — het `targetField` voor de route. */
  field: string;
  sectionId: string;
  sectionType: string;
  /** Container-relatieve positie voor de zwevende UI. */
  top: number;
  left: number;
  currentValue: string;
}

/**
 * Interactielaag over de Step 3-`<PageRender>`-preview (A3+A4, verbeterplan
 * 2026-08-07 §5 Fase B):
 *
 *  - **A4 sectie-hover-toolbar**: verplaats/dupliceer/verwijder (via de
 *    section-edit-tools-kernel incl. verplichte-sectie- en lock-guards),
 *    per-sectie lock-toggle, en een "prompt op deze sectie"-popover met
 *    vrij tekstveld + de 4 preset-chips uit ai-edit-instructions. AI-edits
 *    lopen door `/api/landing-pages/component-edit` en de herbedraadde
 *    ComponentDiffPreviewModal (accept → setSectionProps → onChange).
 *  - **A3 inline tekst-edit**: één klik op een tekst-element maakt het veld
 *    contentEditable wanneer de tekst exact matcht op een
 *    `collectEditableTextFields`-entry van die sectie (pure matching in
 *    preview-edit-matching.ts); Enter/blur committen via deepSet, Escape
 *    annuleert. Deterministisch, geen AI-call.
 *
 * Alle mutaties gaan via `onChange` (= handlePuckChange in PuckPageBuilder,
 * met bestaand debounced-autosave-pad) — deze laag persisteert zelf niets.
 * Links in de preview navigeren nooit (preventDefault), ook bij pageLocked.
 */
export function PreviewEditingLayer({
  puckData,
  contentType,
  config,
  deliverableId,
  pageLocked,
  onChange,
  children,
}: PreviewEditingLayerProps) {
  const { t, i18n } = useTranslation('campaigns-canvas-medium');
  // C2 — brand-archetype voor de pattern-kiezer. Bron: contextStack.brandTokens
  // .archetype (de geclassificeerde Jung-archetype uit de brand-tokens-laag,
  // zelfde stack waar buildSpikePuckConfig zijn tokens uit haalt); de layer
  // leest hem uit de canvas-store zoals de SectionEditor dat ook doet.
  const contextStack = useCanvasStore((s) => s.contextStack);
  const brandArchetype = contextStack?.brandTokens?.archetype ?? null;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const editingRef = useRef<InlineEditSession | null>(null);
  // Altijd-actuele spiegel van puckData voor async handlers (blur-commit,
  // fetch-completion) — de closure-prop is daar mogelijk verouderd. Wordt bij
  // eigen mutaties synchroon bijgewerkt (zelfde patroon als puckDataRef in
  // PuckPageBuilder) zodat snelle opeenvolgende toolbar-clicks niet op een
  // stale tree rekenen.
  const dataRef = useRef<SpikeData>(puckData);
  useEffect(() => {
    dataRef.current = puckData;
  }, [puckData]);

  const [hovered, setHovered] = useState<{ id: string; type: string } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; right: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  // C2 — "Wissel layout"-popover (deterministisch, geen AI-call).
  const [patternPopoverOpen, setPatternPopoverOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<SectionProposal | null>(null);
  // ── B3: element-level select-and-tell ──────────────────────────
  // Tijdens een inline-edit toont een ✨-affordance naast het veld; die
  // schakelt om naar een element-promptbar (targetField-call) met een
  // compacte voor/na-bevestiging — de verfijning van A4's sectie-prompt
  // naar veldniveau (verbeterplan §5 B3).
  const [inlineEditTarget, setInlineEditTarget] = useState<ElementAiTarget | null>(null);
  const [elementPromptTarget, setElementPromptTarget] = useState<ElementAiTarget | null>(null);
  const [elementPromptText, setElementPromptText] = useState('');
  const [elementBusy, setElementBusy] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);
  const [elementProposal, setElementProposal] = useState<(ElementAiTarget & { proposed: string }) | null>(null);

  const clearHover = useCallback(() => {
    setHovered(null);
    setToolbarPos(null);
    setPopoverOpen(false);
    setPatternPopoverOpen(false);
  }, []);

  const refreshToolbarPos = useCallback((sectionId: string) => {
    const container = containerRef.current;
    if (!container) return;
    const sectionEl = container.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`);
    const rect = sectionEl ? sectionBoundingRect(sectionEl) : null;
    if (!rect) {
      // Sectie bestaat niet meer (verwijderd/vervangen) — toolbar weg.
      setHovered(null);
      setToolbarPos(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    setToolbarPos({
      top: Math.max(rect.top - containerRect.top + 8, 0),
      right: Math.max(containerRect.right - rect.right + 8, 8),
    });
  }, []);

  // Herpositioneer bij scroll (capture: de app scrollt via inner containers)
  // en resize zolang er een sectie gehighlight is.
  useEffect(() => {
    if (!hovered) return;
    const handler = () => refreshToolbarPos(hovered.id);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [hovered, refreshToolbarPos]);

  // Structurele ops verschuiven de sectie-boxen — herpositioneer ná de
  // re-render (rAF zodat de layout eerst vers is).
  useEffect(() => {
    if (!hovered) return;
    const raf = requestAnimationFrame(() => refreshToolbarPos(hovered.id));
    return () => cancelAnimationFrame(raf);
  }, [puckData, hovered, refreshToolbarPos]);

  // Lock-wissel reset de hover/popover-state — render-time adjustment
  // (React-patroon "adjusting state when a prop changes") i.p.v. een effect,
  // zodat er geen extra effect-render-cascade ontstaat.
  const [prevLocked, setPrevLocked] = useState(pageLocked);
  if (pageLocked !== prevLocked) {
    setPrevLocked(pageLocked);
    if (pageLocked) clearHover();
  }

  // Unmount-cleanup: een lopende inline-edit netjes loskoppelen (cancel).
  useEffect(
    () => () => {
      const session = editingRef.current;
      if (!session) return;
      editingRef.current = null;
      session.el.removeEventListener('keydown', session.onKeyDown);
      session.el.removeEventListener('blur', session.onBlur);
      session.el.removeAttribute('contenteditable');
    },
    [],
  );

  const hoveredIndex = useMemo(
    () => (hovered ? sectionContentIndex(puckData, hovered.id) : -1),
    [puckData, hovered],
  );
  const sectionLocked = useMemo(
    () => (hovered ? isComponentLocked(puckData as unknown as LockableTree, hovered.id) : false),
    [puckData, hovered],
  );

  // ── A4: hover-tracking ─────────────────────────────────────────
  const handleMouseOver = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (pageLocked || popoverOpen || patternPopoverOpen) return;
      if (!(e.target instanceof Element)) return;
      if (overlayRef.current?.contains(e.target)) return;
      const sectionEl = e.target.closest('[data-section-id]');
      if (!sectionEl || !containerRef.current?.contains(sectionEl)) return;
      const id = sectionEl.getAttribute('data-section-id');
      if (!id || hovered?.id === id) return;
      setAiError(null);
      setHovered({ id, type: sectionEl.getAttribute('data-section-type') ?? '' });
      refreshToolbarPos(id);
    },
    [pageLocked, popoverOpen, patternPopoverOpen, hovered, refreshToolbarPos],
  );

  const handleMouseLeave = useCallback(() => {
    if (popoverOpen || patternPopoverOpen || aiBusy) return;
    clearHover();
  }, [popoverOpen, patternPopoverOpen, aiBusy, clearHover]);

  // ── A4: structurele operaties via de section-edit-tools-kernel ─
  const applyResult = useCallback(
    (result: SectionEditResult): boolean => {
      if (!result.ok) return false;
      const next = asData(result.data);
      dataRef.current = next;
      onChange(next);
      return true;
    },
    [onChange],
  );

  const handleMove = useCallback(
    (direction: 'up' | 'down') => {
      if (!hovered) return;
      applyResult(moveSection(asTree(dataRef.current), hovered.id, direction));
    },
    [hovered, applyResult],
  );

  const handleDuplicate = useCallback(() => {
    if (!hovered) return;
    applyResult(duplicateSection(asTree(dataRef.current), hovered.id));
  }, [hovered, applyResult]);

  const handleRemove = useCallback(() => {
    if (!hovered) return;
    const guard = canRemoveSection(asTree(dataRef.current), contentType, hovered.id);
    if (!guard.ok) {
      if (guard.reasonCode === 'required') {
        window.alert(
          t('pageBuilder.sectionRemoveRequired', { type: guard.sectionType ?? hovered.type }),
        );
      } else if (guard.reasonCode === 'locked') {
        window.alert(t('pageBuilder.sectionRemoveLocked'));
      }
      return;
    }
    if (!window.confirm(t('pageBuilder.sectionRemoveConfirm', { type: hovered.type }))) return;
    if (applyResult(removeSection(asTree(dataRef.current), contentType, hovered.id))) {
      clearHover();
    }
  }, [hovered, contentType, applyResult, clearHover, t]);

  const handleToggleSectionLock = useCallback(() => {
    if (!hovered) return;
    const next = toggleComponentLock(
      dataRef.current as unknown as LockableTree,
      hovered.id,
    ) as unknown as SpikeData;
    dataRef.current = next;
    onChange(next);
  }, [hovered, onChange]);

  // ── C2: "Wissel layout" — deterministische pattern-swap (geen AI-call) ─
  const hoveredSection = hoveredIndex >= 0 ? puckData.content[hoveredIndex] : null;
  const patternOptions = useMemo<SectionPatternOption[]>(() => {
    if (!hovered || !sectionHasPatterns(hovered.type)) return [];
    const itemCount = sectionPatternItemCount(
      hovered.type,
      (hoveredSection?.props ?? null) as Record<string, unknown> | null,
    );
    return listPatternOptions(hovered.type, brandArchetype, itemCount);
  }, [hovered, hoveredSection, brandArchetype]);
  const activePatternKey = hovered
    ? resolveSectionPatternKey(
        hovered.type,
        (hoveredSection?.props as Record<string, unknown> | undefined)?.[SECTION_PATTERN_PROP],
      )
    : 'default';

  const handlePatternPick = useCallback(
    (key: string) => {
      if (!hovered) return;
      // Instant via de kernel (lock-guard inbegrepen) → bestaand autosave-pad.
      applyResult(
        setSectionProps(asTree(dataRef.current), hovered.id, { [SECTION_PATTERN_PROP]: key }),
      );
      setPatternPopoverOpen(false);
    },
    [hovered, applyResult],
  );

  // ── A4: sectie-AI-edit (vrije prompt + preset-chips) ───────────
  const submitSectionAi = useCallback(
    async (payload: { instructionId?: string; instruction?: string }) => {
      const target = hovered;
      if (!target || aiBusy) return;
      const tree = dataRef.current;
      const idx = sectionContentIndex(tree, target.id);
      if (idx < 0) return;
      const current = tree.content[idx];
      setAiBusy(true);
      setAiError(null);
      try {
        const res = await fetch('/api/landing-pages/component-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deliverableId,
            componentId: target.id,
            componentType: current.type,
            currentProps: current.props,
            locked: isComponentLocked(tree as unknown as LockableTree, target.id),
            ...payload,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          proposedProps?: Record<string, unknown>;
          editDistance?: number;
          error?: string;
        } | null;
        if (res.status === 423) {
          setAiError(t('pageBuilder.sectionPromptLocked'));
          return;
        }
        if (!res.ok || !json?.proposedProps) {
          // Servermeldingen zijn Engels/dev-gericht — toon de vertaalde
          // melding en log het detail voor debugging.
          if (json?.error) console.warn('[section-ai]', json.error);
          setAiError(t('pageBuilder.sectionPromptFailed'));
          return;
        }
        const proposed = {
          ...current,
          props: { ...(current.props as Record<string, unknown>), ...json.proposedProps },
        } as SectionInstance;
        setProposal({
          sectionId: target.id,
          current,
          proposed,
          proposedProps: json.proposedProps,
          editDistance: typeof json.editDistance === 'number' ? json.editDistance : 0,
        });
        setPopoverOpen(false);
        setPromptText('');
      } catch (err) {
        setAiError(err instanceof Error ? err.message : t('pageBuilder.sectionPromptFailed'));
      } finally {
        setAiBusy(false);
      }
    },
    [hovered, aiBusy, deliverableId, t],
  );

  const handleAcceptProposal = useCallback(() => {
    if (!proposal) return;
    const result = setSectionProps(
      asTree(dataRef.current),
      proposal.sectionId,
      proposal.proposedProps,
    );
    if (result.ok) {
      const next = asData(result.data);
      dataRef.current = next;
      onChange(next);
    } else {
      setAiError(
        result.reason === 'locked'
          ? t('pageBuilder.sectionPromptLocked')
          : t('pageBuilder.sectionPromptFailed'),
      );
    }
    setProposal(null);
  }, [proposal, onChange, t]);

  // ── A3: inline tekst-edit ──────────────────────────────────────
  const finishInlineEdit = useCallback(
    (commit: boolean) => {
      const session = editingRef.current;
      if (!session) return;
      editingRef.current = null;
      setInlineEditTarget(null);
      const { el } = session;
      el.removeEventListener('keydown', session.onKeyDown);
      el.removeEventListener('blur', session.onBlur);
      el.removeAttribute('contenteditable');
      el.style.outline = '';
      el.style.outlineOffset = '';
      const restore = () => {
        el.textContent = session.originalDom;
      };
      if (!commit) return restore();
      const nextText = (el.textContent ?? '').trim();
      if (nextText.length === 0 || nextText === session.original.trim()) return restore();
      // Pad her-valideren tegen de actuele tree: is de waarde intussen door
      // een andere flow gewijzigd (re-hydrate, AI-accept), commit dan niet blind.
      const liveValue = readPath(dataRef.current, session.path);
      if (typeof liveValue !== 'string' || liveValue.trim() !== session.original.trim()) {
        return restore();
      }
      try {
        const next = structuredClone(dataRef.current) as unknown as Record<string, unknown>;
        deepSet(next, session.path, nextText);
        const nextData = next as unknown as SpikeData;
        dataRef.current = nextData;
        onChange(nextData);
      } catch {
        restore();
      }
    },
    [onChange],
  );

  const startInlineEdit = useCallback(
    (el: HTMLElement, path: string, original: string) => {
      const session: InlineEditSession = {
        el,
        path,
        original,
        originalDom: el.textContent ?? '',
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            finishInlineEdit(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            finishInlineEdit(false);
          }
        },
        onBlur: () => finishInlineEdit(true),
      };
      editingRef.current = session;
      try {
        el.contentEditable = 'plaintext-only';
      } catch {
        el.contentEditable = 'true';
      }
      el.addEventListener('keydown', session.onKeyDown);
      el.addEventListener('blur', session.onBlur);
      el.style.outline = '2px solid #1FD1B2';
      el.style.outlineOffset = '2px';
      el.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      } catch {
        // Select-all is nice-to-have; focus alleen is voldoende.
      }
      // B3-anker: alleen top-level string-props (geneste array-paden vallen
      // buiten het targetField-contract van de route). Container-relatief
      // gepositioneerd naast het veld.
      try {
        const rel = path.replace(/^content\[\d+\]\.props\./, '');
        const isTopLevel = !rel.includes('.') && !rel.includes('[');
        const sectionEl = el.closest('[data-section-id]');
        const sectionId = sectionEl?.getAttribute('data-section-id') ?? '';
        const sectionType = sectionEl?.getAttribute('data-section-type') ?? '';
        const container = containerRef.current?.getBoundingClientRect();
        if (isTopLevel && sectionId && sectionType && container) {
          const r = el.getBoundingClientRect();
          setInlineEditTarget({
            path,
            field: rel,
            sectionId,
            sectionType,
            top: r.top - container.top,
            left: Math.max(8, Math.min(r.right - container.left + 8, container.width - 140)),
            currentValue: original,
          });
        }
      } catch {
        // Geen anker = geen affordance; inline edit werkt gewoon door.
      }
    },
    [finishInlineEdit],
  );

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!(e.target instanceof Element)) return;
      // De preview mag nooit wegnavigeren — links in de secties inert maken,
      // óók bij pageLocked.
      const anchor = e.target.closest('a');
      if (anchor && containerRef.current?.contains(anchor) && !overlayRef.current?.contains(anchor)) {
        e.preventDefault();
      }
      if (pageLocked || popoverOpen || patternPopoverOpen || aiBusy || proposal !== null) return;
      if (elementPromptTarget !== null || elementProposal !== null || elementBusy) return;
      if (editingRef.current) return;
      if (overlayRef.current?.contains(e.target)) return;
      try {
        const textEl = e.target.closest(TEXT_ELEMENT_SELECTOR);
        if (!(textEl instanceof HTMLElement) || !containerRef.current?.contains(textEl)) return;
        const sectionEl = textEl.closest('[data-section-id]');
        const sectionId = sectionEl?.getAttribute('data-section-id');
        if (!sectionEl || !sectionId) return;
        // Per-sectie lock geldt ook voor inline edits (zelfde semantiek als
        // de setSectionProps-guard in de kernel).
        if (isComponentLocked(dataRef.current as unknown as LockableTree, sectionId)) return;
        const text = textEl.textContent ?? '';
        const occurrence = domTextOccurrence(sectionEl, textEl, text);
        const match = findEditableTextPath(dataRef.current, sectionId, text, occurrence);
        if (!match) return;
        startInlineEdit(textEl, match.path, match.value);
      } catch {
        // Nooit throwen op onverwachte DOM — geen match, geen edit.
      }
    },
    [pageLocked, popoverOpen, patternPopoverOpen, aiBusy, proposal, elementPromptTarget, elementProposal, elementBusy, startInlineEdit],
  );

  // ── B3: element-AI submit + accept ─────────────────────────────
  const submitElementAi = useCallback(async () => {
    const target = elementPromptTarget;
    const instruction = elementPromptText.trim();
    if (!target || elementBusy || instruction.length < 3) return;
    const tree = dataRef.current;
    const idx = sectionContentIndex(tree, target.sectionId);
    if (idx < 0) {
      setElementPromptTarget(null);
      return;
    }
    setElementBusy(true);
    setElementError(null);
    try {
      const res = await fetch('/api/landing-pages/component-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableId,
          componentId: target.sectionId,
          componentType: target.sectionType,
          currentProps: tree.content[idx].props,
          targetField: target.field,
          instruction,
          locked: isComponentLocked(tree as unknown as LockableTree, target.sectionId),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        proposedProps?: Record<string, string>;
        error?: string;
      } | null;
      if (res.status === 423) {
        setElementError(t('pageBuilder.sectionPromptLocked'));
        return;
      }
      const proposed = json?.proposedProps?.[target.field];
      if (!res.ok || typeof proposed !== 'string' || proposed.trim().length === 0) {
        setElementError(json?.error ?? t('pageBuilder.elementFailed'));
        return;
      }
      if (proposed.trim() === target.currentValue.trim()) {
        setElementError(t('pageBuilder.elementNoChange'));
        return;
      }
      setElementProposal({ ...target, proposed: proposed.trim() });
      setElementPromptTarget(null);
      setElementPromptText('');
    } catch (err) {
      setElementError(err instanceof Error ? err.message : t('pageBuilder.elementFailed'));
    } finally {
      setElementBusy(false);
    }
  }, [elementPromptTarget, elementPromptText, elementBusy, deliverableId, t]);

  const acceptElementProposal = useCallback(() => {
    const p = elementProposal;
    if (!p) return;
    // Live-guard (zelfde semantiek als de inline-commit): is het veld
    // intussen door een andere flow gewijzigd, pas dan niets toe.
    const liveValue = readPath(dataRef.current, p.path);
    if (typeof liveValue === 'string' && liveValue.trim() === p.currentValue.trim()) {
      const result = setSectionProps(asTree(dataRef.current), p.sectionId, { [p.field]: p.proposed });
      if (result.ok) {
        const next = asData(result.data);
        dataRef.current = next;
        onChange(next);
      }
    }
    setElementProposal(null);
  }, [elementProposal, onChange]);

  const showToolbar = !pageLocked && hovered !== null && toolbarPos !== null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative' }}
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      {/* B3 — ✨-affordance tijdens inline edit: onMouseDown-preventDefault
          voorkomt dat de blur van het contentEditable-veld eerst commit. */}
      {inlineEditTarget && !elementPromptTarget && !elementProposal ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const target = inlineEditTarget;
            finishInlineEdit(false);
            setElementPromptTarget(target);
            setElementPromptText('');
            setElementError(null);
          }}
          style={{ position: 'absolute', top: inlineEditTarget.top, left: inlineEditTarget.left, zIndex: 40 }}
          className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-medium text-teal-700 shadow-md hover:bg-teal-50"
        >
          <Sparkles className="h-3 w-3" />
          {t('pageBuilder.elementAi')}
        </button>
      ) : null}

      {/* B3 — element-promptbar op het veld-anker. */}
      {elementPromptTarget ? (
        <form
          style={{ position: 'absolute', top: elementPromptTarget.top, left: Math.max(8, elementPromptTarget.left - 260), zIndex: 40, width: 300 }}
          className="rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
          onSubmit={(e) => {
            e.preventDefault();
            void submitElementAi();
          }}
        >
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={elementPromptText}
              onChange={(e) => setElementPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setElementPromptTarget(null);
              }}
              placeholder={t('pageBuilder.elementPromptPlaceholder')}
              disabled={elementBusy}
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal-300 focus:outline-none"
            />
            <button
              type="submit"
              disabled={elementBusy || elementPromptText.trim().length < 3}
              className="inline-flex items-center rounded-full bg-teal-600 p-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
              title={t('pageBuilder.elementApply')}
            >
              {elementBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setElementPromptTarget(null)}
              className="inline-flex items-center rounded-full border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
              aria-label={t('pageBuilder.sectionPromptClose')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {elementError ? <p className="mt-1 text-xs text-red-600">{elementError}</p> : null}
        </form>
      ) : null}

      {/* B3 — compacte voor/na-bevestiging op veldniveau. */}
      {elementProposal ? (
        <div
          style={{ position: 'absolute', top: elementProposal.top, left: Math.max(8, elementProposal.left - 300), zIndex: 40, width: 340 }}
          className="space-y-2 rounded-lg border border-teal-200 bg-white p-3 shadow-xl"
        >
          <p className="text-xs text-gray-400 line-through" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {elementProposal.currentValue}
          </p>
          <p className="text-sm text-gray-900">{elementProposal.proposed}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={acceptElementProposal}
              className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
            >
              <Check className="h-3 w-3" />
              {t('pageBuilder.elementAccept')}
            </button>
            <button
              type="button"
              onClick={() => setElementProposal(null)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <X className="h-3 w-3" />
              {t('pageBuilder.elementReject')}
            </button>
          </div>
        </div>
      ) : null}

      {showToolbar ? (
        <div
          ref={overlayRef}
          style={{ position: 'absolute', top: toolbarPos.top, right: toolbarPos.right, zIndex: 60 }}
        >
          <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-md">
            <span className="max-w-[120px] truncate px-1.5 text-[11px] font-medium text-gray-400">
              {hovered.type}
            </span>
            <ToolbarIconButton
              icon={ArrowUp}
              label={t('pageBuilder.sectionMoveUp')}
              onClick={() => handleMove('up')}
              disabled={hoveredIndex <= 0}
            />
            <ToolbarIconButton
              icon={ArrowDown}
              label={t('pageBuilder.sectionMoveDown')}
              onClick={() => handleMove('down')}
              disabled={hoveredIndex < 0 || hoveredIndex >= puckData.content.length - 1}
            />
            <ToolbarIconButton
              icon={Copy}
              label={t('pageBuilder.sectionDuplicate')}
              onClick={handleDuplicate}
            />
            <ToolbarIconButton
              icon={Trash2}
              label={t('pageBuilder.sectionRemove')}
              onClick={handleRemove}
              tone="danger"
            />
            <ToolbarIconButton
              icon={sectionLocked ? Unlock : Lock}
              label={sectionLocked ? t('pageBuilder.sectionUnlock') : t('pageBuilder.sectionLock')}
              onClick={handleToggleSectionLock}
              tone={sectionLocked ? 'active' : 'default'}
            />
            {/* C2 — "Wissel layout": alleen voor sectie-types mét patterns;
                deterministische swap via de kernel, geen AI-call. */}
            {sectionHasPatterns(hovered.type) ? (
              <ToolbarIconButton
                icon={LayoutGrid}
                label={t('pageBuilder.patterns.button')}
                onClick={() => {
                  setPopoverOpen(false);
                  setPatternPopoverOpen((open) => !open);
                }}
                disabled={sectionLocked}
              />
            ) : null}
            <ToolbarIconButton
              icon={Sparkles}
              label={t('pageBuilder.sectionAiPrompt')}
              onClick={() => {
                setAiError(null);
                setPatternPopoverOpen(false);
                setPopoverOpen((open) => !open);
              }}
              disabled={sectionLocked}
            />
          </div>
          {aiError && !popoverOpen ? (
            <p className="mt-1 max-w-[280px] rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 shadow-sm">
              {aiError}
            </p>
          ) : null}
          {popoverOpen ? (
            <SectionPromptPopover
              busy={aiBusy}
              error={aiError}
              promptText={promptText}
              onPromptText={setPromptText}
              nlLabels={i18n.language?.startsWith('nl') === true}
              onSubmitFree={() => void submitSectionAi({ instruction: promptText.trim() })}
              onSubmitPreset={(id) => void submitSectionAi({ instructionId: id })}
              onClose={() => {
                setPopoverOpen(false);
                setAiError(null);
              }}
            />
          ) : null}
          {patternPopoverOpen ? (
            <PatternSwapPopover
              options={patternOptions}
              activeKey={activePatternKey}
              onPick={handlePatternPick}
              onClose={() => setPatternPopoverOpen(false)}
            />
          ) : null}
        </div>
      ) : null}

      {proposal ? (
        <ComponentDiffPreviewModal
          config={config}
          current={proposal.current}
          proposed={proposal.proposed}
          editDistance={proposal.editDistance}
          onAccept={handleAcceptProposal}
          onReject={() => setProposal(null)}
        />
      ) : null}
    </div>
  );
}

/** Icon-knop in de sectie-hover-toolbar (Lucide, title + aria-label). */
function ToolbarIconButton({
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
  tone?: 'default' | 'danger' | 'active';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-600 hover:bg-red-50'
      : tone === 'active'
        ? 'text-amber-600 hover:bg-amber-50'
        : 'text-gray-600 hover:bg-gray-100';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * C2 — popover onder de sectie-toolbar: de brand-toegestane layout-patronen
 * van dit sectie-type (registry-labels zijn NL — geen i18n-dubbel). Klik =
 * instant `setSectionProps({ patternKey })` via de kernel, geen AI-call.
 * Patterns die op content-eisen stranden (minItems) staan uitgegrijsd mét
 * reden; archetype-vreemde patterns zijn hier al weggefilterd.
 */
function PatternSwapPopover({
  options,
  activeKey,
  onPick,
  onClose,
}: {
  options: SectionPatternOption[];
  activeKey: string;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  return (
    <div
      className="mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-700">
          {t('pageBuilder.patterns.popoverTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pageBuilder.sectionPromptClose')}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="space-y-0.5">
        {options.map(({ definition, enabled, disabledReason }) => {
          const isActive = definition.key === activeKey;
          const reason =
            disabledReason === 'min-items'
              ? t('pageBuilder.patterns.minItems', { count: definition.minItems ?? 0 })
              : null;
          return (
            <li key={definition.key}>
              <button
                type="button"
                disabled={!enabled}
                title={reason ?? definition.label}
                onClick={() => onPick(definition.key)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  isActive
                    ? 'bg-emerald-50 font-medium text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{definition.label}</span>
                  {reason ? (
                    <span className="block truncate text-[10px] text-gray-400">{reason}</span>
                  ) : null}
                </span>
                {isActive ? (
                  <Check aria-label={t('pageBuilder.patterns.active')} className="h-3.5 w-3.5 shrink-0" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Popover onder de sectie-toolbar: vrij promptveld + de 4 preset-chips uit
 * ai-edit-instructions. Escape sluit; submit → component-edit-route.
 */
function SectionPromptPopover({
  busy,
  error,
  promptText,
  onPromptText,
  nlLabels,
  onSubmitFree,
  onSubmitPreset,
  onClose,
}: {
  busy: boolean;
  error: string | null;
  promptText: string;
  onPromptText: (value: string) => void;
  nlLabels: boolean;
  onSubmitFree: () => void;
  onSubmitPreset: (id: AiInstruction['id']) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('campaigns-canvas-medium');
  return (
    <div
      className="mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">
          {t('pageBuilder.sectionAiPrompt')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pageBuilder.sectionPromptClose')}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitFree();
        }}
      >
        <input
          type="text"
          value={promptText}
          onChange={(e) => onPromptText(e.target.value)}
          placeholder={t('pageBuilder.sectionPromptPlaceholder')}
          aria-label={t('pageBuilder.sectionPromptPlaceholder')}
          disabled={busy}
          autoFocus
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-100 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={busy || promptText.trim().length < 3}
          title={t('pageBuilder.sectionPromptSubmit')}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {busy ? t('pageBuilder.sectionPromptRunning') : t('pageBuilder.sectionPromptSubmit')}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {listInstructions().map((instruction) => (
          <button
            key={instruction.id}
            type="button"
            disabled={busy}
            onClick={() => onSubmitPreset(instruction.id)}
            className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nlLabels ? (instruction.labelNl ?? instruction.label) : instruction.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
