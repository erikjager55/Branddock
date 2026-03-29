// =============================================================
// Content Canvas Store — Zustand (bulk selection for grid/timeline)
// =============================================================

import { create } from 'zustand';

interface ContentCanvasStoreState {
  selectedDeliverableIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useContentCanvasStore = create<ContentCanvasStoreState>((set) => ({
  selectedDeliverableIds: new Set(),

  toggleSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedDeliverableIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedDeliverableIds: next };
    }),

  selectAll: (ids) =>
    set({ selectedDeliverableIds: new Set(ids) }),

  clearSelection: () =>
    set({ selectedDeliverableIds: new Set() }),
}));
