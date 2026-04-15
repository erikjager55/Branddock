'use client';

import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
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

export interface SelectedContextEntry {
  sourceType: string;
  sourceId: string;
  title: string;
}

interface KnowledgeContextSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: Map<string, SelectedContextEntry>) => void;
  groups: ContextGroup[] | undefined;
  isLoading: boolean;
  isPending?: boolean;
  excludedGroups?: string[];
  initialSelected?: Map<string, SelectedContextEntry>;
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
}: KnowledgeContextSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SourceType>('all');
  const [selected, setSelected] = useState<Map<string, SelectedContextEntry>>(
    () => initialSelected ? new Map(initialSelected) : new Map(),
  );

  // Build filter chips dynamically from groups
  const filterChips = useMemo(() => {
    if (!groups) return [{ key: 'all' as SourceType, label: 'All', icon: SEARCH_ICON }];
    const allowedGroups = groups.filter((g) => !excludedGroups.includes(g.key));
    return [
      { key: 'all' as SourceType, label: 'All', icon: SEARCH_ICON },
      ...allowedGroups.map((g) => ({
        key: g.key as SourceType,
        label: g.label,
        icon: CONTEXT_ICON_MAP[g.icon] || DEFAULT_SOURCE_ICON,
      })),
    ];
  }, [groups, excludedGroups]);

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
    setSelected(new Map());
    setSearchQuery('');
    setActiveFilter('all');
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
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              {searchQuery ? 'No items match your search' : 'No context items available'}
            </div>
          ) : (
            filteredItems.map((item) => {
              const key = `${item.sourceType}:${item.sourceId}`;
              const isItemSelected = selected.has(key);
              const meta = SOURCE_TYPE_META[item.sourceType];
              const Icon = meta?.icon ?? DEFAULT_SOURCE_ICON;
              const badgeStyle = BADGE_STYLES[item.sourceType];

              return (
                <button
                  key={key}
                  onClick={() => toggleItem(item)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                    isItemSelected
                      ? 'bg-teal-50/60'
                      : 'hover:bg-gray-50'
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
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
