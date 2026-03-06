import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, List } from 'lucide-react';
import { FILTER_PATTERNS, ICON_SIZES, SPACING } from '@/lib/constants/design-tokens';
import { SearchInput } from '@/components/shared';

export type ViewMode = 'grid' | 'list';

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter dropdowns/selects as children */
  filters?: ReactNode;
  /** View mode toggle */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  /** Extra actions on the right */
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue, onSearchChange, searchPlaceholder = 'Search...',
  filters, viewMode, onViewModeChange, actions, className,
}: FilterBarProps) {
  return (
    <div className={cn(FILTER_PATTERNS.contentFilterBar, SPACING.section.marginBottomSmall, className)}>
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      </div>
      {filters}
      <div className="flex items-center gap-2 ml-auto">
        {viewMode && onViewModeChange && (
          <div className={FILTER_PATTERNS.tabsContainer}>
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                FILTER_PATTERNS.tabItem,
                viewMode === 'grid' ? FILTER_PATTERNS.tabItemActive : FILTER_PATTERNS.tabItemInactive
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className={ICON_SIZES.sm} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                FILTER_PATTERNS.tabItem,
                viewMode === 'list' ? FILTER_PATTERNS.tabItemActive : FILTER_PATTERNS.tabItemInactive
              )}
              aria-label="List view"
            >
              <List className={ICON_SIZES.sm} />
            </button>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
