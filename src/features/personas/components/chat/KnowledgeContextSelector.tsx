'use client';

import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/shared';
import { useAvailableContext, useSaveContext } from '../../hooks';
import {
  SOURCE_TYPE_META,
  CONTEXT_ICON_MAP,
  DEFAULT_SOURCE_ICON,
  SEARCH_ICON,
} from '@/lib/ai/context/source-ui-config';
import type { AvailableContextGroupItem } from '../../api/persona-chat.api';

type SourceType = 'all' | string;

/**
 * Groups to hide from the persona chat context selector.
 * - brand_asset/brandstyle: already auto-injected via brand context
 * - persona: you're already talking TO a persona
 */
const EXCLUDED_GROUPS = ['brand_asset', 'brandstyle', 'persona'];

interface FlatItem extends AvailableContextGroupItem {
  groupLabel: string;
}

interface KnowledgeContextSelectorProps {
  personaId: string;
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeContextSelector({
  personaId,
  sessionId,
  isOpen,
  onClose,
}: KnowledgeContextSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SourceType>('all');
  const [selected, setSelected] = useState<Map<string, { sourceType: string; sourceId: string }>>(
    new Map(),
  );

  const { data, isLoading } = useAvailableContext(isOpen ? personaId : undefined);
  const saveContext = useSaveContext(personaId, sessionId);

  // Build filter chips dynamically from groups (excluding irrelevant ones)
  const filterChips = useMemo(() => {
    if (!data?.groups) return [{ key: 'all' as SourceType, label: 'All', icon: SEARCH_ICON }];
    const allowedGroups = data.groups.filter((g) => !EXCLUDED_GROUPS.includes(g.key));
    return [
      { key: 'all' as SourceType, label: 'All', icon: SEARCH_ICON },
      ...allowedGroups.map((g) => ({
        key: g.key as SourceType,
        label: g.label,
        icon: CONTEXT_ICON_MAP[g.icon] || DEFAULT_SOURCE_ICON,
      })),
    ];
  }, [data]);

  // Flatten all items from groups into a single list (excluding irrelevant groups)
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!data?.groups) return [];
    const items: FlatItem[] = [];
    for (const group of data.groups) {
      if (EXCLUDED_GROUPS.includes(group.key)) continue;
      for (const item of group.items) {
        items.push({ ...item, groupLabel: group.label });
      }
    }
    return items;
  }, [data]);

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
        next.set(key, { sourceType: item.sourceType, sourceId: item.sourceId });
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (selected.size === 0 || !sessionId) return;

    const items = Array.from(selected.values());

    try {
      await saveContext.mutateAsync(items);
      onClose();
      setSelected(new Map());
      setSearchQuery('');
      setActiveFilter('all');
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    onClose();
    setSelected(new Map());
    setSearchQuery('');
    setActiveFilter('all');
  };

  const SearchIcon = SEARCH_ICON;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Knowledge Context"
      subtitle={`${flatItems.length} items available`}
      size="xl"
      className="mt-8"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">
            {selected.size} item{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selected.size === 0 || saveContext.isPending}
              style={{
                backgroundColor: selected.size > 0 ? 'hsl(var(--primary))' : '#e5e7eb',
                color: selected.size > 0 ? '#ffffff' : '#9ca3af',
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed"
            >
              {saveContext.isPending ? 'Applying...' : 'Apply Selection'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {filterChips.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeFilter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setActiveFilter(chip.key)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Items list */}
        <div className="max-h-[40vh] overflow-y-auto border border-gray-200 rounded-lg">
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
              const isSelected = selected.has(key);
              const meta = SOURCE_TYPE_META[item.sourceType];
              const Icon = meta?.icon ?? DEFAULT_SOURCE_ICON;

              return (
                <button
                  key={key}
                  onClick={() => toggleItem(item)}
                  className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-b-0 ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className="flex items-center justify-center rounded border flex-shrink-0 transition-colors"
                    style={{
                      width: 18,
                      height: 18,
                      ...(isSelected
                        ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }
                        : { backgroundColor: '#ffffff', borderColor: '#d1d5db' }),
                    }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Icon */}
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 truncate">{item.description}</p>
                    )}
                  </div>

                  {/* Type badge */}
                  {meta && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${meta.color}`}
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
