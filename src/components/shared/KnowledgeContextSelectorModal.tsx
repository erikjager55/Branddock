'use client';

import { useState, useMemo, useRef } from 'react';
import { Check, Plus, Link2, Upload } from 'lucide-react';
import { Modal } from '@/components/shared';
import {
  SOURCE_TYPE_META,
  CONTEXT_ICON_MAP,
  DEFAULT_SOURCE_ICON,
  SEARCH_ICON,
} from '@/lib/ai/context/source-ui-config';
import type { ContextGroup, ContextGroupItem } from '@/lib/ai/context/fetcher';

type SourceType = 'all' | string;

interface FlatItem extends ContextGroupItem {
  groupLabel: string;
}

export type ContextItemPriority = 'primary' | 'reference';

export interface SelectedContextEntry {
  sourceType: string;
  sourceId: string;
  title: string;
  /** Optional user guidance on how to use this source. */
  note?: string;
  /** 'primary' = authoritative source material; 'reference' (default) = ambient context. */
  priority?: ContextItemPriority;
}

/**
 * Opt-in inline "add knowledge" capability. When provided, the modal renders a
 * compact panel to add a link or upload a file; the host persists it (to the
 * Knowledge Library) and returns the created entry so it is auto-selected.
 * Returns null on a handled failure. Persona-chat omits this → no add UI.
 */
export interface InlineAddConfig {
  onAddLink: (data: { title: string; url: string; description: string }) => Promise<SelectedContextEntry | null>;
  onAddFile: (file: File) => Promise<SelectedContextEntry | null>;
  /** Real upload ceiling (bytes) — surfaced in the hint so it matches the route. */
  maxFileSizeBytes: number;
  /** Allowed extensions for the picker accept attr + hint, e.g. ['.pdf', '.txt']. */
  acceptExtensions: string[];
}

interface KnowledgeContextSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: Map<string, SelectedContextEntry>) => void;
  groups: ContextGroup[] | undefined;
  isLoading: boolean;
  isPending?: boolean;
  excludedGroups?: string[];
  /**
   * Selection to seed each time the modal opens. MUST be referentially stable
   * across renders (e.g. a store-held Map) — the open-reseed effect keys on the
   * isOpen transition and reads this at open time; passing a freshly-built
   * `new Map(...)` inline on every render is fine for seeding but won't reflect
   * mid-session mutations until the next open.
   */
  initialSelected?: Map<string, SelectedContextEntry>;
  /** When set, shows an inline "add knowledge (link/file)" panel. */
  inlineAdd?: InlineAddConfig;
}

/** Badge color styles using inline styles to avoid Tailwind 4 purge issues */
const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  brand_asset:           { bg: '#d1fae5', text: '#047857' },
  brandstyle:            { bg: '#fce7f3', text: '#be185d' },
  persona:               { bg: '#e0e7ff', text: '#4338ca' },
  product:               { bg: '#dbeafe', text: '#1d4ed8' },
  detected_trend:        { bg: '#fef3c7', text: '#b45309' },
  knowledge_resource:    { bg: '#f3e8ff', text: '#7e22ce' },
  campaign:              { bg: '#ffe4e6', text: '#be123c' },
  deliverable:           { bg: '#e0f2fe', text: '#0369a1' },
  competitor:            { bg: '#ffedd5', text: '#c2410c' },
  business_strategy:     { bg: '#cffafe', text: '#0e7490' },
  strategic_implication:  { bg: '#ccfbf1', text: '#0d9488' },
};

/**
 * Shared modal for selecting knowledge context items.
 * Used by both persona chat and canvas context selectors.
 */
export function KnowledgeContextSelectorModal({
  isOpen,
  onClose,
  onApply,
  groups,
  isLoading,
  isPending = false,
  excludedGroups = [],
  initialSelected,
  inlineAdd,
}: KnowledgeContextSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SourceType>('all');
  const [selected, setSelected] = useState<Map<string, SelectedContextEntry>>(
    () => initialSelected ? new Map(initialSelected) : new Map(),
  );

  // ─── Inline add (opt-in) ──────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<'link' | 'file'>('link');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canInlineAdd = !!inlineAdd;

  // Re-seed the selection each time the modal opens. The component is mounted
  // permanently (open/close is a boolean toggle), so the lazy useState
  // initializer only runs once — without this, re-opening starts empty and
  // Apply REPLACES the store map, silently dropping previously-selected items.
  // Uses React's guarded "adjust state when a prop changes during render"
  // pattern (no effect → no extra commit). initialSelected is a store-held Map
  // (stable identity until a real mutation), so this never clobbers in-progress
  // checkbox edits while the modal is open.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelected(initialSelected ? new Map(initialSelected) : new Map());
    }
  }

  const selectEntry = (entry: SelectedContextEntry) => {
    const key = `${entry.sourceType}:${entry.sourceId}`;
    setSelected((prev) => new Map(prev).set(key, entry));
  };

  // Patch note/priority on an already-selected item (lives in the local
  // `selected` Map so edits survive open/close until Apply).
  const updateSelectedItem = (key: string, patch: Partial<SelectedContextEntry>) => {
    setSelected((prev) => {
      const existing = prev.get(key);
      if (!existing) return prev;
      return new Map(prev).set(key, { ...existing, ...patch });
    });
  };

  const handleAddLink = async () => {
    if (!inlineAdd) return;
    const title = linkTitle.trim();
    const url = linkUrl.trim();
    if (!title || !url) {
      setAddError('Title and URL are required');
      return;
    }
    try {
      new URL(url);
    } catch {
      setAddError('Enter a valid URL (e.g. https://example.com)');
      return;
    }
    setAddPending(true);
    setAddError(null);
    try {
      const entry = await inlineAdd.onAddLink({ title, url, description: linkDesc.trim() });
      if (entry) {
        selectEntry(entry);
        setLinkTitle('');
        setLinkUrl('');
        setLinkDesc('');
        setAddOpen(false);
      } else {
        setAddError('Could not add the link');
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not add the link');
    } finally {
      setAddPending(false);
    }
  };

  const handleAddFile = async (file: File) => {
    if (!inlineAdd) return;
    if (file.size > inlineAdd.maxFileSizeBytes) {
      setAddError(`File too large (max ${Math.round(inlineAdd.maxFileSizeBytes / 1024 / 1024)}MB)`);
      return;
    }
    setAddPending(true);
    setAddError(null);
    try {
      const entry = await inlineAdd.onAddFile(file);
      if (entry) {
        selectEntry(entry);
        setAddOpen(false);
      } else {
        setAddError('Could not upload the file');
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Could not upload the file');
    } finally {
      setAddPending(false);
    }
  };

  // Build filter chips dynamically from groups
  const filterChips = useMemo(() => {
    if (!groups) return [{ key: 'all' as SourceType, label: 'All', icon: SEARCH_ICON }];
    // Show a chip for a group only when it has items, failed to load, OR is the
    // inline-add target (knowledge_resource in the canvas picker — so the user
    // can find where to add even when empty). This keeps the F3 empty-group
    // emission from cluttering other consumers (e.g. persona chat) with chips
    // for genuinely-empty unrelated categories.
    const allowedGroups = groups.filter(
      (g) =>
        !excludedGroups.includes(g.key) &&
        (g.items.length > 0 || g.error || (canInlineAdd && g.key === 'knowledge_resource')),
    );
    return [
      { key: 'all' as SourceType, label: 'All', icon: SEARCH_ICON },
      ...allowedGroups.map((g) => ({
        key: g.key as SourceType,
        label: g.label,
        icon: CONTEXT_ICON_MAP[g.icon] || DEFAULT_SOURCE_ICON,
      })),
    ];
  }, [groups, excludedGroups, canInlineAdd]);

  // Flatten all items from groups into a single list
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!groups) return [];
    const items: FlatItem[] = [];
    for (const group of groups) {
      if (excludedGroups.includes(group.key)) continue;
      for (const item of group.items) {
        items.push({ ...item, groupLabel: group.label });
      }
    }
    return items;
  }, [groups, excludedGroups]);

  // Filter items based on search and active filter
  const filteredItems = useMemo(() => {
    let items = flatItems;

    if (activeFilter !== 'all') {
      items = items.filter((i) => i.sourceType === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)),
      );
    }

    return items;
  }, [flatItems, activeFilter, searchQuery]);

  // F3: the group behind the active filter (if any) + whether any source
  // failed to load — drives the "couldn't load" vs "genuinely empty" copy.
  const activeGroup = useMemo(
    () => (activeFilter !== 'all' ? groups?.find((g) => g.key === activeFilter) : undefined),
    [groups, activeFilter],
  );
  const anyGroupError = useMemo(() => (groups ?? []).some((g) => g.error), [groups]);

  const toggleItem = (item: FlatItem) => {
    const key = `${item.sourceType}:${item.sourceId}`;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { sourceType: item.sourceType, sourceId: item.sourceId, title: item.title });
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(selected);
    resetAndClose();
  };

  const resetAndClose = () => {
    onClose();
    // NOTE: do NOT clear `selected` here — the open-effect owns (re)seeding it
    // from initialSelected. Clearing on close is what dropped the persisted
    // selection on the next Apply. Only transient add/search/filter state resets.
    setSearchQuery('');
    setActiveFilter('all');
    setAddOpen(false);
    setAddError(null);
    setLinkTitle('');
    setLinkUrl('');
    setLinkDesc('');
  };

  const SearchIcon = SEARCH_ICON;

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Select Knowledge Context"
      subtitle={`${flatItems.length} items available`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">
            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={resetAndClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selected.size === 0 || isPending}
              style={{
                backgroundColor: selected.size > 0 ? '#0d9488' : '#e5e7eb',
                color: selected.size > 0 ? '#ffffff' : '#9ca3af',
              }}
              className="px-5 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Applying...' : 'Apply Selection'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Inline add (opt-in) — add a link or upload a file straight into the
            Knowledge Library; the new item is auto-selected. */}
        {inlineAdd && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
            {!addOpen ? (
              <button
                type="button"
                onClick={() => { setAddOpen(true); setAddError(null); }}
                className="flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                <Plus className="h-4 w-4" />
                Add knowledge (link or file)
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setAddTab('link'); setAddError(null); }}
                    style={addTab === 'link' ? { backgroundColor: '#ccfbf1', color: '#0d9488' } : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      addTab === 'link' ? 'ring-1 ring-teal-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" /> Link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddTab('file'); setAddError(null); }}
                    style={addTab === 'file' ? { backgroundColor: '#ccfbf1', color: '#0d9488' } : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      addTab === 'file' ? 'ring-1 ring-teal-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" /> File
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddOpen(false); setAddError(null); }}
                    className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>

                {addTab === 'link' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <textarea
                      value={linkDesc}
                      onChange={(e) => setLinkDesc(e.target.value)}
                      placeholder="What this is about (optional context for the AI)"
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-y"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      disabled={addPending || !linkTitle.trim() || !linkUrl.trim()}
                      style={{
                        backgroundColor: !addPending && linkTitle.trim() && linkUrl.trim() ? '#0d9488' : '#e5e7eb',
                        color: !addPending && linkTitle.trim() && linkUrl.trim() ? '#ffffff' : '#9ca3af',
                      }}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
                    >
                      {addPending ? 'Adding…' : 'Add to library'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={addPending}
                      className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-500 hover:border-teal-400 hover:text-teal-700 transition-colors disabled:opacity-60"
                    >
                      <Upload className="h-5 w-5" />
                      {addPending ? 'Uploading…' : 'Click to choose a file'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={inlineAdd.acceptExtensions.join(',')}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAddFile(file);
                        e.target.value = '';
                      }}
                    />
                    <p className="text-[11px] text-gray-400">
                      Max {Math.round(inlineAdd.maxFileSizeBytes / 1024 / 1024)}MB · {inlineAdd.acceptExtensions.join(', ')} · PDF and text are read into the AI context
                    </p>
                  </div>
                )}

                {addError && <p className="text-xs text-red-600">{addError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeFilter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setActiveFilter(chip.key)}
                style={isActive ? { backgroundColor: '#ccfbf1', color: '#0d9488' } : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  isActive
                    ? 'ring-1 ring-teal-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Items list */}
        <div className="max-h-[40vh] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading available context...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-12 px-6 text-center text-sm text-gray-400">
              {searchQuery ? (
                <span>No items match your search</span>
              ) : activeGroup?.error ? (
                <span className="text-amber-600">Could not load {activeGroup.label}. Try again later.</span>
              ) : activeGroup ? (
                <>
                  <span>No items in {activeGroup.label} yet.</span>
                  {inlineAdd && activeGroup.key === 'knowledge_resource' && (
                    <span className="text-xs text-gray-400">Use Add knowledge above to add a link or file.</span>
                  )}
                </>
              ) : anyGroupError ? (
                <span className="text-amber-600">Some sources could not load. Showing what is available.</span>
              ) : (
                <>
                  <span>No context items in this workspace yet.</span>
                  {inlineAdd && (
                    <span className="text-xs text-gray-400">Use Add knowledge above to add your first item.</span>
                  )}
                </>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const key = `${item.sourceType}:${item.sourceId}`;
              const isItemSelected = selected.has(key);
              const meta = SOURCE_TYPE_META[item.sourceType];
              const Icon = meta?.icon ?? DEFAULT_SOURCE_ICON;
              const badgeStyle = BADGE_STYLES[item.sourceType];

              const entry = selected.get(key);
              const priority = entry?.priority ?? 'reference';

              return (
                <div key={key} className={isItemSelected ? 'bg-teal-50/60' : ''}>
                  <button
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                      isItemSelected ? '' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      style={isItemSelected ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : undefined}
                      className={`flex items-center justify-center h-5 w-5 rounded flex-shrink-0 transition-colors ${
                        isItemSelected
                          ? ''
                          : 'bg-white border border-gray-300'
                      }`}
                    >
                      {isItemSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>

                    {/* Icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                      )}
                    </div>

                    {/* Type badge — inline styles for Tailwind 4 purge safety */}
                    {meta && (
                      <span
                        style={badgeStyle ? { backgroundColor: badgeStyle.bg, color: badgeStyle.text } : undefined}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                      >
                        {meta.label}
                      </span>
                    )}
                  </button>

                  {/* Per-item priority + guidance — only for selected items.
                      Outside the toggle <button> (textarea cannot nest in a button). */}
                  {isItemSelected && (
                    <div className="px-4 pb-3 pl-12 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-500">Use as:</span>
                        {(['primary', 'reference'] as const).map((p) => {
                          const active = priority === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => updateSelectedItem(key, { priority: p })}
                              style={active ? { backgroundColor: '#0d9488', color: '#ffffff' } : undefined}
                              className={`px-2 py-0.5 text-[11px] font-medium rounded-full transition-colors ${
                                active ? '' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {p === 'primary' ? 'Source material' : 'Reference'}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={entry?.note ?? ''}
                        onChange={(e) => updateSelectedItem(key, { note: e.target.value })}
                        placeholder="Guidance for the AI on this source — e.g. emphasize this vision, play up this contrast (optional)"
                        rows={2}
                        maxLength={500}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 resize-y"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
