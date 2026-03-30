import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMediaAssets,
  fetchMediaAssetDetail,
  fetchFeaturedMedia,
  fetchMediaStats,
  uploadMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  toggleFavorite,
  toggleArchive,
  toggleFeatured,
  importFromUrl,
  bulkUploadMedia,
  bulkDeleteMedia,
  fetchMediaTags,
  createMediaTag,
  updateMediaTag,
  deleteMediaTag,
  fetchMediaCollections,
  fetchCollectionDetail,
  createCollection,
  updateCollection,
  deleteCollection,
  addAssetToCollection,
  removeAssetFromCollection,
  reorderCollectionAssets,
  searchStockPhotos,
  importStockPhoto,
  fetchBrandVoices,
  fetchBrandVoiceDetail,
  createBrandVoice,
  updateBrandVoice,
  deleteBrandVoice,
  fetchElevenLabsVoices,
  generateBrandVoiceSample,
  fetchSoundEffects,
  fetchSoundEffectDetail,
  uploadSoundEffect,
  generateSoundEffectApi,
  updateSoundEffect,
  deleteSoundEffect,
  fetchAiImages,
  fetchAiImageDetail,
  generateAiImage,
  updateAiImage,
  deleteAiImage,
  fetchAiVideos,
  fetchAiVideoDetail,
  generateAiVideo,
  updateAiVideo,
  deleteAiVideo,
} from '../api/media.api';
import type {
  MediaListParams,
  CreateMediaBody,
  UpdateMediaBody,
  ImportUrlBody,
  CreateTagBody,
  UpdateTagBody,
  CreateCollectionBody,
  UpdateCollectionBody,
  CreateBrandVoiceBody,
  UpdateBrandVoiceBody,
  ImportStockBody,
  MediaAssetWithMeta,
  CreateSoundEffectBody,
  GenerateSoundEffectBody,
  UpdateSoundEffectBody,
  GenerateImageBody,
  UpdateGeneratedImageBody,
  GenerateVideoBody,
  UpdateGeneratedVideoBody,
} from '../types/media.types';

// ─── Query Key Factory ──────────────────────────────────────

export const mediaKeys = {
  all: ['media'] as const,
  list: (filters?: MediaListParams) => [...mediaKeys.all, 'list', filters] as const,
  detail: (id: string) => [...mediaKeys.all, 'detail', id] as const,
  featured: () => [...mediaKeys.all, 'featured'] as const,
  stats: () => [...mediaKeys.all, 'stats'] as const,
  tags: () => [...mediaKeys.all, 'tags'] as const,
  collections: () => [...mediaKeys.all, 'collections'] as const,
  collectionDetail: (id: string) => [...mediaKeys.all, 'collection', id] as const,
  stockSearch: (query: string, page: number) => [...mediaKeys.all, 'stock', query, page] as const,
  brandVoices: () => [...mediaKeys.all, 'brand-voices'] as const,
  brandVoiceDetail: (id: string) => [...mediaKeys.all, 'brand-voice', id] as const,
  elevenLabsVoices: () => [...mediaKeys.all, 'elevenlabs-voices'] as const,
  soundEffects: () => [...mediaKeys.all, 'sound-effects'] as const,
  soundEffectDetail: (id: string) => [...mediaKeys.all, 'sound-effect', id] as const,
  aiImages: (favorite?: boolean) => [...mediaKeys.all, 'ai-images', favorite] as const,
  aiImageDetail: (id: string) => [...mediaKeys.all, 'ai-image', id] as const,
  aiVideos: (favorite?: boolean) => [...mediaKeys.all, 'ai-videos', favorite] as const,
  aiVideoDetail: (id: string) => [...mediaKeys.all, 'ai-video', id] as const,
};

// ─── Media Assets ────────────────────────────────────────────

export function useMediaAssets(filters?: MediaListParams) {
  return useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: () => fetchMediaAssets(filters),
    staleTime: 30_000,
  });
}

export function useMediaAssetDetail(id: string) {
  return useQuery({
    queryKey: mediaKeys.detail(id),
    queryFn: () => fetchMediaAssetDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useFeaturedMedia() {
  return useQuery({
    queryKey: mediaKeys.featured(),
    queryFn: fetchFeaturedMedia,
    staleTime: 30_000,
  });
}

export function useMediaStats() {
  return useQuery({
    queryKey: mediaKeys.stats(),
    queryFn: fetchMediaStats,
    staleTime: 30_000,
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, body }: { file: File; body: CreateMediaBody }) =>
      uploadMediaAsset(file, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useUpdateMediaAsset(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMediaBody) => updateMediaAsset(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.detail(id) });
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useDeleteMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMediaAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleFavorite(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: mediaKeys.list() });
      const prev = qc.getQueryData(mediaKeys.list());
      qc.setQueriesData<{ assets: MediaAssetWithMeta[] }>(
        { queryKey: mediaKeys.all },
        (old) => {
          if (!old?.assets) return old;
          return {
            ...old,
            assets: old.assets.map((a) =>
              a.id === id ? { ...a, isFavorite: !a.isFavorite } : a
            ),
          };
        }
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(mediaKeys.list(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useToggleArchive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleArchive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useToggleFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleFeatured(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useImportFromUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ImportUrlBody) => importFromUrl(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

// ─── Bulk Operations ─────────────────────────────────────────

export function useBulkUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => bulkUploadMedia(files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteMedia(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

// ─── Tags ────────────────────────────────────────────────────

export function useMediaTags() {
  return useQuery({
    queryKey: mediaKeys.tags(),
    queryFn: fetchMediaTags,
    staleTime: 60_000,
  });
}

export function useCreateMediaTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTagBody) => createMediaTag(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.tags() });
    },
  });
}

export function useUpdateMediaTag(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTagBody) => updateMediaTag(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.tags() });
    },
  });
}

export function useDeleteMediaTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMediaTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.tags() });
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

// ─── Collections ─────────────────────────────────────────────

export function useMediaCollections() {
  return useQuery({
    queryKey: mediaKeys.collections(),
    queryFn: fetchMediaCollections,
    staleTime: 30_000,
  });
}

export function useCollectionDetail(id: string) {
  return useQuery({
    queryKey: mediaKeys.collectionDetail(id),
    queryFn: () => fetchCollectionDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCollectionBody) => createCollection(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.collections() });
    },
  });
}

export function useUpdateCollection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCollectionBody) => updateCollection(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.collectionDetail(id) });
      qc.invalidateQueries({ queryKey: mediaKeys.collections() });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.collections() });
    },
  });
}

export function useAddAssetToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, assetId }: { collectionId: string; assetId: string }) =>
      addAssetToCollection(collectionId, assetId),
    onSuccess: (_data, { collectionId }) => {
      qc.invalidateQueries({ queryKey: mediaKeys.collectionDetail(collectionId) });
      qc.invalidateQueries({ queryKey: mediaKeys.collections() });
    },
  });
}

export function useRemoveAssetFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, assetId }: { collectionId: string; assetId: string }) =>
      removeAssetFromCollection(collectionId, assetId),
    onSuccess: (_data, { collectionId }) => {
      qc.invalidateQueries({ queryKey: mediaKeys.collectionDetail(collectionId) });
      qc.invalidateQueries({ queryKey: mediaKeys.collections() });
    },
  });
}

export function useReorderCollectionAssets(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetIds: string[]) => reorderCollectionAssets(collectionId, assetIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.collectionDetail(collectionId) });
    },
  });
}

// ─── Stock Photos ────────────────────────────────────────────

export function useStockSearch(query: string, page: number, enabled = true) {
  return useQuery({
    queryKey: mediaKeys.stockSearch(query, page),
    queryFn: () => searchStockPhotos(query, page),
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60_000,
  });
}

export function useImportStockPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ImportStockBody) => importStockPhoto(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

// ─── Brand Voices ────────────────────────────────────────────

export function useBrandVoices() {
  return useQuery({
    queryKey: mediaKeys.brandVoices(),
    queryFn: fetchBrandVoices,
    staleTime: 60_000,
  });
}

export function useBrandVoiceDetail(id: string) {
  return useQuery({
    queryKey: mediaKeys.brandVoiceDetail(id),
    queryFn: () => fetchBrandVoiceDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateBrandVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBrandVoiceBody) => createBrandVoice(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.brandVoices() });
    },
  });
}

export function useUpdateBrandVoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBrandVoiceBody) => updateBrandVoice(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.brandVoiceDetail(id) });
      qc.invalidateQueries({ queryKey: mediaKeys.brandVoices() });
    },
  });
}

export function useDeleteBrandVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBrandVoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.brandVoices() });
    },
  });
}

// ─── ElevenLabs Voices ──────────────────────────────────────

export function useElevenLabsVoices() {
  return useQuery({
    queryKey: mediaKeys.elevenLabsVoices(),
    queryFn: fetchElevenLabsVoices,
    staleTime: 5 * 60_000,
  });
}

export function useGenerateSample(voiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => generateBrandVoiceSample(voiceId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.brandVoiceDetail(voiceId) });
      qc.invalidateQueries({ queryKey: mediaKeys.brandVoices() });
    },
  });
}

// ─── Sound Effects ──────────────────────────────────────────

export function useSoundEffects() {
  return useQuery({
    queryKey: mediaKeys.soundEffects(),
    queryFn: fetchSoundEffects,
    staleTime: 30_000,
  });
}

export function useSoundEffectDetail(id: string) {
  return useQuery({
    queryKey: mediaKeys.soundEffectDetail(id),
    queryFn: () => fetchSoundEffectDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useUploadSoundEffect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, body }: { file: File; body: CreateSoundEffectBody }) =>
      uploadSoundEffect(file, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.soundEffects() });
    },
  });
}

export function useGenerateSoundEffect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateSoundEffectBody) => generateSoundEffectApi(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.soundEffects() });
    },
  });
}

export function useUpdateSoundEffect(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSoundEffectBody) => updateSoundEffect(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.soundEffectDetail(id) });
      qc.invalidateQueries({ queryKey: mediaKeys.soundEffects() });
    },
  });
}

export function useDeleteSoundEffect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSoundEffect(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.soundEffects() });
    },
  });
}

// ─── AI Images ──────────────────────────────────────────────

export function useAiImages(favorite?: boolean) {
  return useQuery({
    queryKey: mediaKeys.aiImages(favorite),
    queryFn: () => fetchAiImages(favorite),
    staleTime: 30_000,
  });
}

export function useAiImageDetail(id: string) {
  return useQuery({
    queryKey: mediaKeys.aiImageDetail(id),
    queryFn: () => fetchAiImageDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useGenerateAiImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateImageBody) => generateAiImage(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...mediaKeys.all, 'ai-images'] });
    },
  });
}

export function useUpdateAiImage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGeneratedImageBody) => updateAiImage(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.aiImageDetail(id) });
      qc.invalidateQueries({ queryKey: [...mediaKeys.all, 'ai-images'] });
    },
  });
}

export function useDeleteAiImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiImage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...mediaKeys.all, 'ai-images'] });
    },
  });
}

// ─── AI Videos ──────────────────────────────────────────────

export function useAiVideos(favorite?: boolean) {
  return useQuery({
    queryKey: mediaKeys.aiVideos(favorite),
    queryFn: () => fetchAiVideos(favorite),
    staleTime: 30_000,
  });
}

export function useAiVideoDetail(id: string) {
  return useQuery({
    queryKey: mediaKeys.aiVideoDetail(id),
    queryFn: () => fetchAiVideoDetail(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useGenerateAiVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateVideoBody) => generateAiVideo(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...mediaKeys.all, 'ai-videos'] });
    },
  });
}

export function useUpdateAiVideo(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGeneratedVideoBody) => updateAiVideo(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.aiVideoDetail(id) });
      qc.invalidateQueries({ queryKey: [...mediaKeys.all, 'ai-videos'] });
    },
  });
}

export function useDeleteAiVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiVideo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...mediaKeys.all, 'ai-videos'] });
    },
  });
}
