import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ArrowRight,
  Sparkles,
  UserPlus,
  Link,
  LayoutDashboard,
  Target,
  Layers,
  Users,
  Package,
  TrendingUp,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSearch, useQuickActions } from '../hooks/use-search';
import { useShellStore } from '../stores/useShellStore';
import { CardLockIndicator } from './lock';
import type { SearchResult } from '../types/search';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onAction?: (actionId: string) => void;
}

interface DisplayItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  route?: string;
  section?: string;
  action?: () => void;
  isLocked?: boolean;
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'brand_assets', label: 'Assets' },
  { key: 'personas', label: 'Personas' },
  { key: 'products', label: 'Products' },
  { key: 'insights', label: 'Insights' },
  { key: 'campaigns', label: 'Campaigns' },
] as const;

const GO_TO_ITEMS: DisplayItem[] = [
  { id: 'goto-dashboard', title: 'Dashboard', icon: 'LayoutDashboard', route: 'dashboard', section: 'Go To' },
  { id: 'goto-research', title: 'Research Hub', icon: 'Target', route: 'research', section: 'Go To' },
  { id: 'goto-brand', title: 'Brand Assets', icon: 'Layers', route: 'brand', section: 'Go To' },
  { id: 'goto-personas', title: 'Personas', icon: 'Users', route: 'personas', section: 'Go To' },
  { id: 'goto-products', title: 'Products & Services', icon: 'Package', route: 'products', section: 'Go To' },
  { id: 'goto-insights', title: 'Market Insights', icon: 'TrendingUp', route: 'trends', section: 'Go To' },
];

const QUICK_ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  UserPlus,
  Link,
};

export function GlobalSearchModal({ isOpen, onClose, onNavigate, onAction }: GlobalSearchModalProps) {
  const { searchQuery, setSearchQuery } = useShellStore();
  const [typeFilter, setTypeFilter] = useState<typeof TYPE_FILTERS[number]['key']>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced query for API
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchData } = useSearch({
    query: debouncedQuery,
    type: typeFilter === 'all' ? undefined : typeFilter,
    limit: 20,
  });

  const { data: quickActions } = useQuickActions();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery('');
      setTypeFilter('all');
      setSelectedIndex(0);
    }
  }, [isOpen, setSearchQuery]);

  // Build display sections
  const sections = useMemo(() => {
    const result: { id: string; label: string; items: DisplayItem[] }[] = [];

    if (debouncedQuery.length >= 2 && searchData?.results) {
      // Search results
      const items: DisplayItem[] = searchData.results.map((r: SearchResult) => ({
        id: r.id,
        title: r.title,
        subtitle: r.type,
        description: r.description ?? undefined,
        icon: r.icon,
        route: r.href,
        isLocked: r.isLocked,
      }));
      if (items.length > 0) {
        result.push({ id: 'results', label: 'Search Results', items });
      }
    } else {
      // Quick Actions
      if (quickActions && quickActions.length > 0) {
        result.push({
          id: 'quick-actions',
          label: 'Quick Actions',
          items: quickActions.map((qa: { id: string; label: string; description: string; icon: string; href: string }) => ({
            id: `qa-${qa.id}`,
            title: qa.label,
            description: qa.description,
            icon: qa.icon,
            route: qa.href,
          })),
        });
      }

      // Go To
      result.push({
        id: 'go-to',
        label: 'Go To',
        items: GO_TO_ITEMS,
      });
    }

    return result;
  }, [debouncedQuery, searchData, quickActions]);

  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const maxIndex = allItems.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, maxIndex));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allItems[selectedIndex]) handleSelect(allItems[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, typeFilter]);

  // Auto-scroll
  useEffect(() => {
    const el = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  const handleSelect = (item: DisplayItem) => {
    if (item.action) {
      item.action();
      onAction?.(item.id);
    } else if (item.route) {
      onNavigate(item.route);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        <div
          data-testid="global-search-modal"
          className="w-full max-w-2xl mx-4 bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              data-testid="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search everything..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
              ESC
            </kbd>
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  typeFilter === f.key
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
            {debouncedQuery.length >= 2 && sections.length === 0 ? (
              <div className="px-4 py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No results found for &quot;{debouncedQuery}&quot;</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              sections.map((section, sectionIdx) => (
                <div key={section.id} className={sectionIdx > 0 ? 'border-t border-border' : ''}>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                    {section.label}
                  </div>
                  <div>
                    {section.items.map((item, itemIdx) => {
                      const globalIndex = sections
                        .slice(0, sectionIdx)
                        .reduce((acc, s) => acc + s.items.length, 0) + itemIdx;
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[item.icon] || LucideIcons.Circle;

                      return (
                        <button
                          key={item.id}
                          data-index={globalIndex}
                          onClick={() => handleSelect(item)}
                          className={`w-full flex items-start gap-3 px-4 py-3 transition-colors ${
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          }`}
                        >
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-sm text-muted-foreground truncate">{item.subtitle}</div>
                            )}
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-3">
                            {item.isLocked && (
                              <CardLockIndicator isLocked className="w-5 h-5" />
                            )}
                            {isSelected && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↓</kbd>
                  <span className="ml-1">Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↵</kbd>
                  <span className="ml-1">Select</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Powered by search</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
