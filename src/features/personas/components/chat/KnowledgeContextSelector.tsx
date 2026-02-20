'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Building2,
  Package,
  TrendingUp,
  BookOpen,
  Megaphone,
  FileText,
  Palette,
  Check,
} from 'lucide-react';
import { Modal } from '@/components/shared';
import { useAvailableContext, useSaveContext } from '../../hooks';
import type { AvailableContextGroupItem } from '../../api/persona-chat.api';

type SourceType = 'all' | string;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Package,
  TrendingUp,
  BookOpen,
  Megaphone,
  FileText,
  Palette,
};

const SOURCE_TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  brand_asset: { label: 'Brand Asset', icon: Building2, color: 'bg-emerald-100 text-emerald-700' },
  product: { label: 'Product', icon: Package, color: 'bg-blue-100 text-blue-700' },
  market_insight: { label: 'Insight', icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
  knowledge_resource: { label: 'Library', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  campaign: { label: 'Campaign', icon: Megaphone, color: 'bg-rose-100 text-rose-700' },
  deliverable: { label: 'Deliverable', icon: FileText, color: 'bg-sky-100 text-sky-700' },
  brandstyle: { label: 'Brandstyle', icon: Palette, color: 'bg-pink-100 text-pink-700' },
};

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

  // Build filter chips dynamically from groups
  const filterChips = useMemo(() => {
    if (!data?.groups) return [{ key: 'all' as SourceType, label: 'All', icon: Search }];
    return [
      { key: 'all' as SourceType, label: 'All', icon: Search },
      ...data.groups.map((g) => ({
        key: g.key as SourceType,
        label: g.label,
        icon: ICON_MAP[g.icon] || FileText,
      })),
    ];
  }, [data]);

  // Flatten all items from groups into a single list
  const flatItems = useMemo<FlatItem[]>(() => {
    if (!data?.groups) return [];
    const items: FlatItem[] = [];
    for (const group of data.groups) {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Knowledge Context"
      subtitle={`${flatItems.length} items available`}
      size="xl"
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
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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
                    ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300'
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
        <div className="max-h-[40vh] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
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
              const Icon = meta?.icon ?? FileText;

              return (
                <button
                  key={key}
                  onClick={() => toggleItem(item)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                    isSelected ? 'bg-teal-50/50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded border flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-teal-600 border-teal-600'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Icon */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
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
