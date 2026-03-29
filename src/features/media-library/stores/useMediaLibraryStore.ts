import { create } from 'zustand';
import type { MediaType, MediaCategory, MediaSource } from '../types/media.types';
import type { MediaViewMode } from '../constants/media-constants';

type UploadTab = 'upload' | 'import-url' | 'stock' | 'ai';
type ActiveTab = 'library' | 'collections' | 'tags' | 'creative-hub';
type CreativeHubTab = 'brand-models' | 'photography' | 'animation' | 'brand-voice';

interface MediaLibraryStore {
  // View
  viewMode: MediaViewMode;
  activeTab: ActiveTab;
  creativeHubTab: CreativeHubTab;

  // Filters
  searchQuery: string;
  mediaTypeFilter: MediaType | null;
  categoryFilter: MediaCategory | null;
  sourceFilter: MediaSource | null;
  tagFilter: string | null;
  collectionFilter: string | null;
  isFavoriteFilter: boolean | null;

  // Sort
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Pagination
  page: number;
  limit: number;

  // Upload Modal
  isUploadModalOpen: boolean;
  activeUploadTab: UploadTab;

  // Detail Panel
  selectedAssetId: string | null;

  // Collection Modal
  isCreateCollectionModalOpen: boolean;
  isAddToCollectionModalOpen: boolean;
  addToCollectionAssetId: string | null;

  // Tag Modal
  isTagManagerModalOpen: boolean;

  // Selection (for bulk operations)
  selectedAssetIds: Set<string>;

  // Actions
  setViewMode: (mode: MediaViewMode) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setCreativeHubTab: (tab: CreativeHubTab) => void;
  setSearchQuery: (q: string) => void;
  setMediaTypeFilter: (t: MediaType | null) => void;
  setCategoryFilter: (c: MediaCategory | null) => void;
  setSourceFilter: (s: MediaSource | null) => void;
  setTagFilter: (t: string | null) => void;
  setCollectionFilter: (c: string | null) => void;
  setIsFavoriteFilter: (f: boolean | null) => void;
  setSortBy: (s: string) => void;
  setSortOrder: (o: 'asc' | 'desc') => void;
  setPage: (p: number) => void;
  setUploadModalOpen: (open: boolean) => void;
  setActiveUploadTab: (tab: UploadTab) => void;
  setSelectedAssetId: (id: string | null) => void;
  setCreateCollectionModalOpen: (open: boolean) => void;
  openAddToCollection: (assetId: string) => void;
  closeAddToCollection: () => void;
  setTagManagerModalOpen: (open: boolean) => void;
  toggleAssetSelection: (id: string) => void;
  selectAllAssets: (ids: string[]) => void;
  clearSelection: () => void;
  resetFilters: () => void;
}

export const useMediaLibraryStore = create<MediaLibraryStore>((set) => ({
  viewMode: 'grid',
  activeTab: 'library',
  creativeHubTab: 'brand-models',

  searchQuery: '',
  mediaTypeFilter: null,
  categoryFilter: null,
  sourceFilter: null,
  tagFilter: null,
  collectionFilter: null,
  isFavoriteFilter: null,

  sortBy: 'createdAt',
  sortOrder: 'desc',

  page: 1,
  limit: 24,

  isUploadModalOpen: false,
  activeUploadTab: 'upload',

  selectedAssetId: null,

  isCreateCollectionModalOpen: false,
  isAddToCollectionModalOpen: false,
  addToCollectionAssetId: null,

  isTagManagerModalOpen: false,

  selectedAssetIds: new Set(),

  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCreativeHubTab: (tab) => set({ creativeHubTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q, page: 1 }),
  setMediaTypeFilter: (t) => set({ mediaTypeFilter: t, page: 1 }),
  setCategoryFilter: (c) => set({ categoryFilter: c, page: 1 }),
  setSourceFilter: (s) => set({ sourceFilter: s, page: 1 }),
  setTagFilter: (t) => set({ tagFilter: t, page: 1 }),
  setCollectionFilter: (c) => set({ collectionFilter: c, page: 1 }),
  setIsFavoriteFilter: (f) => set({ isFavoriteFilter: f, page: 1 }),
  setSortBy: (s) => set({ sortBy: s }),
  setSortOrder: (o) => set({ sortOrder: o }),
  setPage: (p) => set({ page: p }),
  setUploadModalOpen: (open) =>
    set(
      open
        ? { isUploadModalOpen: true }
        : { isUploadModalOpen: false, activeUploadTab: 'upload' }
    ),
  setActiveUploadTab: (tab) => set({ activeUploadTab: tab }),
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setCreateCollectionModalOpen: (open) => set({ isCreateCollectionModalOpen: open }),
  openAddToCollection: (assetId) =>
    set({ isAddToCollectionModalOpen: true, addToCollectionAssetId: assetId }),
  closeAddToCollection: () =>
    set({ isAddToCollectionModalOpen: false, addToCollectionAssetId: null }),
  setTagManagerModalOpen: (open) => set({ isTagManagerModalOpen: open }),
  toggleAssetSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedAssetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedAssetIds: next };
    }),
  selectAllAssets: (ids) => set({ selectedAssetIds: new Set(ids) }),
  clearSelection: () => set({ selectedAssetIds: new Set() }),
  resetFilters: () =>
    set({
      searchQuery: '',
      mediaTypeFilter: null,
      categoryFilter: null,
      sourceFilter: null,
      tagFilter: null,
      collectionFilter: null,
      isFavoriteFilter: null,
      page: 1,
    }),
}));

// Selectors
export const useMediaViewMode = () => useMediaLibraryStore((s) => s.viewMode);
export const useMediaActiveTab = () => useMediaLibraryStore((s) => s.activeTab);
export const useMediaSearchQuery = () => useMediaLibraryStore((s) => s.searchQuery);
export const useMediaTypeFilter = () => useMediaLibraryStore((s) => s.mediaTypeFilter);
export const useMediaCategoryFilter = () => useMediaLibraryStore((s) => s.categoryFilter);
export const useSelectedMediaAssetId = () => useMediaLibraryStore((s) => s.selectedAssetId);
export const useIsUploadModalOpen = () => useMediaLibraryStore((s) => s.isUploadModalOpen);
export const useMediaSelectedAssetIds = () => useMediaLibraryStore((s) => s.selectedAssetIds);
