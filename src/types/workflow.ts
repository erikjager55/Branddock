/**
 * WORKFLOW OPTIMIZATION TYPES
 * 
 * Type definitions for workflow enhancement features:
 * - Keyboard shortcuts
 * - Quick actions
 * - Recent items
 * - Global search
 * - Breadcrumb navigation
 */

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export type ShortcutKey = 
  | 'mod+k'      // Global search (Cmd+K / Ctrl+K)
  | 'mod+n'      // New research
  | 'mod+b'      // Go to brand
  | 'mod+r'      // Go to research
  | 'mod+d'      // Go to dashboard
  | 'mod+s'      // Save current
  | 'mod+/'      // Show shortcuts help
  | 'mod+,'      // Settings
  | 'esc'        // Close modal/cancel
  | 'mod+['      // Go back
  | 'mod+]'      // Go forward
  | 'g+d'        // Go to dashboard (vim-style)
  | 'g+b'        // Go to brand (vim-style)
  | 'g+r'        // Go to research (vim-style)
  | 'g+p'        // Go to personas (vim-style)
  | 'g+s'        // Go to strategy (vim-style)
  | '?';         // Show shortcuts help

export interface KeyboardShortcut {
  key: ShortcutKey;
  label: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'general';
  enabled?: boolean;
}

export interface ShortcutCategory {
  id: string;
  label: string;
  shortcuts: KeyboardShortcut[];
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: string; // Lucide icon name
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean; // Show divider after this item
  danger?: boolean; // Red/destructive action
}

export interface QuickActionsMenuProps {
  x: number;
  y: number;
  actions: QuickAction[];
  onClose: () => void;
}

export type QuickActionContext = 
  | 'brand-asset'
  | 'persona'
  | 'research-plan'
  | 'strategy-tool'
  | 'product'
  | 'trend'
  | 'knowledge'
  | 'dashboard'
  | 'global';

// ============================================================================
// RECENT ITEMS
// ============================================================================

export type RecentItemType = 
  | 'brand-asset'
  | 'persona'
  | 'research-plan'
  | 'research-method'
  | 'strategy-tool'
  | 'product'
  | 'trend'
  | 'knowledge'
  | 'page';

export interface RecentItem {
  id: string;
  type: RecentItemType;
  title: string;
  subtitle?: string;
  icon?: string; // Lucide icon name
  timestamp: number;
  route: string; // Navigation route
  metadata?: {
    status?: string;
    category?: string;
    progress?: number;
  };
}

export interface RecentItemsConfig {
  maxItems: number;
  persistKey: string;
  excludeTypes?: RecentItemType[];
}

// ============================================================================
// GLOBAL SEARCH
// ============================================================================

export type SearchResultType = 
  | 'brand-asset'
  | 'persona'
  | 'research-plan'
  | 'research-method'
  | 'strategy-tool'
  | 'product'
  | 'trend'
  | 'knowledge'
  | 'action'
  | 'page';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  route?: string; // Navigation route
  action?: () => void; // Direct action
  metadata?: {
    status?: string;
    category?: string;
    lastModified?: string;
    score?: number; // Relevance score
  };
  highlighted?: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
}

export interface SearchSection {
  id: string;
  label: string;
  results: SearchResult[];
  showMore?: boolean;
}

export interface SearchFilters {
  types?: SearchResultType[];
  status?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface SearchConfig {
  placeholder?: string;
  maxResults?: number;
  minSearchLength?: number;
  debounceMs?: number;
  fuzzyMatch?: boolean;
  filters?: SearchFilters;
}

// ============================================================================
// BREADCRUMB NAVIGATION
// ============================================================================

export interface BreadcrumbItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  isActive?: boolean;
  dropdown?: BreadcrumbDropdownItem[];
}

export interface BreadcrumbDropdownItem {
  id: string;
  label: string;
  icon?: string;
  route: string;
  badge?: string;
}

export interface BreadcrumbConfig {
  maxItems?: number;
  showHome?: boolean;
  separator?: 'slash' | 'chevron' | 'arrow';
}

// ============================================================================
// NAVIGATION HISTORY
// ============================================================================

export interface NavigationHistoryItem {
  route: string;
  label: string;
  timestamp: number;
}

export interface NavigationHistory {
  past: NavigationHistoryItem[];
  future: NavigationHistoryItem[];
  current: NavigationHistoryItem | null;
}

// ============================================================================
// WORKFLOW CONTEXT
// ============================================================================

export interface WorkflowContext {
  currentPage: string;
  currentAssetId?: string;
  currentResearchId?: string;
  currentPersonaId?: string;
  recentItems: RecentItem[];
  navigationHistory: NavigationHistory;
  shortcuts: KeyboardShortcut[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}
