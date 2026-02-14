/**
 * HOOK: Bulk Selection
 * 
 * Custom hook for managing multi-select state and operations.
 */

import { useState, useCallback, useMemo } from 'react';
import { BulkSelectionState } from '../types/bulk-operations';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Selection state
  const selectionState: BulkSelectionState = useMemo(() => ({
    selectedIds,
    isAllSelected: items.length > 0 && selectedIds.size === items.length,
    totalItems: items.length
  }), [selectedIds, items.length]);

  // Toggle single item
  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle all items
  const toggleAll = useCallback(() => {
    if (selectionState.isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  }, [selectionState.isAllSelected, items]);

  // Select by criteria
  const selectByCriteria = useCallback((predicate: (item: T) => boolean) => {
    const matchingIds = items.filter(predicate).map(item => item.id);
    setSelectedIds(new Set(matchingIds));
  }, [items]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Select multiple
  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Add to selection
  const addToSelection = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  // Remove from selection
  const removeFromSelection = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  // Get selected items
  const getSelectedItems = useCallback(() => {
    return items.filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // Check if item is selected
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  return {
    selectionState,
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected: selectionState.isAllSelected,
    toggleItem,
    toggleAll,
    selectByCriteria,
    clearSelection,
    selectMultiple,
    addToSelection,
    removeFromSelection,
    getSelectedItems,
    isSelected
  };
}
