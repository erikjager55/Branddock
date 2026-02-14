/**
 * SERVICE: Filter Service
 * 
 * Core filtering, sorting, and grouping engine.
 * Handles all data transformations for views.
 */

import {
  FilterCondition,
  FilterGroup,
  FilterOperator,
  SortConfig,
  GroupConfig,
  GroupedData,
  SearchConfig,
  FilterResult,
  FilterPreset
} from '../types/filtering';

class FilterService {
  private presets: Map<string, FilterPreset> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadPresets();
  }

  // ==========================================================================
  // FILTERING
  // ==========================================================================

  /**
   * Apply filters to data
   */
  filter<T>(items: T[], filterGroup: FilterGroup): T[] {
    if (!filterGroup.conditions.length) {
      return items;
    }

    return items.filter(item => {
      const results = filterGroup.conditions.map(condition => 
        this.evaluateCondition(item, condition)
      );

      return filterGroup.logic === 'AND'
        ? results.every(r => r)
        : results.some(r => r);
    });
  }

  /**
   * Evaluate a single filter condition
   */
  private evaluateCondition<T>(item: T, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(item, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      
      case 'notEquals':
        return fieldValue !== conditionValue;
      
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      
      case 'notContains':
        return !String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
      
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
      
      case 'greaterThan':
        return Number(fieldValue) > Number(conditionValue);
      
      case 'lessThan':
        return Number(fieldValue) < Number(conditionValue);
      
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      
      case 'notIn':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      
      case 'isEmpty':
        return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case 'isNotEmpty':
        return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      
      default:
        return true;
    }
  }

  /**
   * Get field value from item (supports nested fields)
   */
  private getFieldValue<T>(item: T, field: string): any {
    const parts = field.split('.');
    let value: any = item;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // ==========================================================================
  // SORTING
  // ==========================================================================

  /**
   * Sort items
   */
  sort<T>(items: T[], sortConfig: SortConfig): T[] {
    if (!sortConfig.options.length) {
      return items;
    }

    return [...items].sort((a, b) => {
      for (const sortOption of sortConfig.options) {
        const aValue = this.getFieldValue(a, sortOption.field);
        const bValue = this.getFieldValue(b, sortOption.field);

        const comparison = this.compareValues(aValue, bValue);
        
        if (comparison !== 0) {
          return sortOption.direction === 'asc' ? comparison : -comparison;
        }
      }

      return 0;
    });
  }

  /**
   * Compare two values
   */
  private compareValues(a: any, b: any): number {
    // Handle null/undefined
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Handle strings (case insensitive)
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();

    return aStr.localeCompare(bStr);
  }

  // ==========================================================================
  // GROUPING
  // ==========================================================================

  /**
   * Group items by field
   */
  group<T>(items: T[], groupConfig: GroupConfig): GroupedData<T>[] {
    const grouped = new Map<string, T[]>();

    // Group items
    for (const item of items) {
      const groupValue = this.getFieldValue(item, groupConfig.field);
      const groupKey = groupValue != null ? String(groupValue) : 'ungrouped';

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }

      grouped.get(groupKey)!.push(item);
    }

    // Convert to array and create GroupedData
    const groups: GroupedData<T>[] = Array.from(grouped.entries()).map(([key, items]) => ({
      groupKey: key,
      groupLabel: this.formatGroupLabel(key),
      items,
      isCollapsed: groupConfig.collapsedGroups?.includes(key) || false
    }));

    // Sort groups if needed
    if (groupConfig.direction) {
      groups.sort((a, b) => {
        const comparison = this.compareValues(a.groupKey, b.groupKey);
        return groupConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return groups;
  }

  /**
   * Format group label for display
   */
  private formatGroupLabel(key: string): string {
    if (key === 'ungrouped') {
      return 'Ungrouped';
    }

    // Capitalize first letter
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  /**
   * Search items
   */
  search<T>(items: T[], searchConfig: SearchConfig): T[] {
    if (!searchConfig.query || !searchConfig.fields.length) {
      return items;
    }

    const query = searchConfig.caseSensitive 
      ? searchConfig.query 
      : searchConfig.query.toLowerCase();

    return items.filter(item => {
      for (const field of searchConfig.fields) {
        const value = this.getFieldValue(item, field);
        if (value == null) continue;

        const valueStr = searchConfig.caseSensitive
          ? String(value)
          : String(value).toLowerCase();

        if (searchConfig.exactMatch) {
          if (valueStr === query) return true;
        } else {
          if (valueStr.includes(query)) return true;
        }
      }

      return false;
    });
  }

  // ==========================================================================
  // COMPLETE FILTERING
  // ==========================================================================

  /**
   * Apply all filters, sorting, grouping, and search
   */
  applyAll<T>(
    items: T[],
    filters: FilterGroup,
    sort?: SortConfig,
    group?: GroupConfig,
    search?: SearchConfig
  ): FilterResult<T> {
    const totalCount = items.length;

    // 1. Apply filters
    let filtered = this.filter(items, filters);

    // 2. Apply search
    if (search) {
      filtered = this.search(filtered, search);
    }

    // 3. Apply sorting
    if (sort) {
      filtered = this.sort(filtered, sort);
    }

    // 4. Apply grouping
    let groups: GroupedData<T>[] | undefined;
    if (group) {
      groups = this.group(filtered, group);
    }

    return {
      items: filtered,
      totalCount,
      filteredCount: filtered.length,
      groups,
      appliedFilters: filters.conditions,
      appliedSort: sort,
      appliedGroup: group
    };
  }

  // ==========================================================================
  // PRESETS
  // ==========================================================================

  /**
   * Save a filter preset
   */
  savePreset(preset: FilterPreset): void {
    this.presets.set(preset.id, preset);
    this.savePresetsToStorage();
    this.notifyListeners();
  }

  /**
   * Delete a filter preset
   */
  deletePreset(presetId: string): void {
    const preset = this.presets.get(presetId);
    
    // Don't delete system presets
    if (preset?.isSystem) {
      console.warn('Cannot delete system preset');
      return;
    }

    this.presets.delete(presetId);
    this.savePresetsToStorage();
    this.notifyListeners();
  }

  /**
   * Get all presets
   */
  getPresets(): FilterPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get preset by ID
   */
  getPreset(presetId: string): FilterPreset | undefined {
    return this.presets.get(presetId);
  }

  /**
   * Load presets from localStorage
   */
  private loadPresets(): void {
    try {
      const stored = localStorage.getItem('filter-presets');
      if (stored) {
        const presets = JSON.parse(stored) as FilterPreset[];
        presets.forEach(preset => {
          this.presets.set(preset.id, preset);
        });
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
    }
  }

  /**
   * Save presets to localStorage
   */
  private savePresetsToStorage(): void {
    try {
      const presets = Array.from(this.presets.values());
      localStorage.setItem('filter-presets', JSON.stringify(presets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }

  /**
   * Subscribe to preset changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const filterService = new FilterService();
