/**
 * TYPES: Advanced Filtering & Views
 * 
 * Type definitions for filtering, sorting, grouping, and view modes.
 */

// ============================================================================
// VIEW MODES
// ============================================================================

export type ViewMode = 'grid' | 'list' | 'table' | 'kanban';

export interface ViewModeOption {
  id: ViewMode;
  label: string;
  icon: string;
  description: string;
}

// ============================================================================
// FILTER SYSTEM
// ============================================================================

export type FilterOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

export type FilterFieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'select' 
  | 'multiselect'
  | 'status'
  | 'category';

export interface FilterField {
  id: string;
  label: string;
  type: FilterFieldType;
  options?: FilterOption[]; // For select/multiselect
  placeholder?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  fieldType: FilterFieldType;
}

export interface FilterGroup {
  id: string;
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

// ============================================================================
// FILTER PRESETS
// ============================================================================

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterGroup;
  sort?: SortConfig;
  group?: GroupConfig;
  isDefault?: boolean;
  isSystem?: boolean; // System presets can't be deleted
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// SORTING
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: string;
  direction: SortDirection;
}

export interface SortConfig {
  options: SortOption[];
}

export interface SortField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status';
}

// ============================================================================
// GROUPING
// ============================================================================

export interface GroupConfig {
  field: string;
  direction?: SortDirection;
  collapsedGroups?: string[]; // IDs of collapsed groups
}

export interface GroupField {
  id: string;
  label: string;
  type: FilterFieldType;
}

export interface GroupedData<T> {
  groupKey: string;
  groupLabel: string;
  groupColor?: string;
  items: T[];
  isCollapsed?: boolean;
}

// ============================================================================
// SEARCH
// ============================================================================

export interface SearchConfig {
  query: string;
  fields: string[]; // Which fields to search in
  caseSensitive?: boolean;
  exactMatch?: boolean;
}

// ============================================================================
// COMPLETE VIEW STATE
// ============================================================================

export interface ViewState {
  viewMode: ViewMode;
  filters: FilterGroup;
  sort: SortConfig;
  group?: GroupConfig;
  search?: SearchConfig;
  activePreset?: string; // ID of active preset
}

// ============================================================================
// FILTER CONTEXT
// ============================================================================

export interface FilterContext {
  availableFields: FilterField[];
  availableSortFields: SortField[];
  availableGroupFields: GroupField[];
  presets: FilterPreset[];
}

// ============================================================================
// FILTER RESULT
// ============================================================================

export interface FilterResult<T> {
  items: T[];
  totalCount: number;
  filteredCount: number;
  groups?: GroupedData<T>[];
  appliedFilters: FilterCondition[];
  appliedSort?: SortConfig;
  appliedGroup?: GroupConfig;
}
