import type {
  MediaAssetWithMeta,
  MediaAssetDetailResponse,
  MediaListParams,
  MediaListResponse,
  CreateMediaBody,
  UpdateMediaBody,
  MediaTagWithCount,
  CreateTagBody,
  UpdateTagBody,
  MediaCollectionWithMeta,
  MediaCollectionDetail,
  CreateCollectionBody,
  UpdateCollectionBody,
  StyleReferenceWithMeta,
  CreateStyleReferenceBody,
  UpdateStyleReferenceBody,
  BrandVoiceWithMeta,
  CreateBrandVoiceBody,
  UpdateBrandVoiceBody,
  ImportUrlBody,
  ImportUrlResponse,
  StockSearchResponse,
  ImportStockBody,
  MediaStats,
  ElevenLabsVoice,
  SoundEffectWithMeta,
  CreateSoundEffectBody,
  GenerateSoundEffectBody,
  UpdateSoundEffectBody,
  GeneratedImageWithMeta,
  GenerateImageBody,
  UpdateGeneratedImageBody,
} from '../types/media.types';

const BASE = '/api/media';

// ─── Media Assets ────────────────────────────────────────────

export async function fetchMediaAssets(
  params?: MediaListParams
): Promise<MediaListResponse> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.mediaType) sp.set('mediaType', params.mediaType);
  if (params?.category) sp.set('category', params.category);
  if (params?.source) sp.set('source', params.source);
  if (params?.tagId) sp.set('tagId', params.tagId);
  if (params?.collectionId) sp.set('collectionId', params.collectionId);
  if (params?.productId) sp.set('productId', params.productId);
  if (params?.isFavorite !== undefined) sp.set('isFavorite', String(params.isFavorite));
  if (params?.isArchived !== undefined) sp.set('isArchived', String(params.isArchived));
  if (params?.sortBy) sp.set('sortBy', params.sortBy);
  if (params?.sortOrder) sp.set('sortOrder', params.sortOrder);
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  const res = await fetch(`${BASE}${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch media assets');
  return res.json();
}

export async function fetchMediaAssetDetail(id: string): Promise<MediaAssetDetailResponse> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch media asset detail');
  return res.json();
}

export async function fetchFeaturedMedia(): Promise<MediaAssetWithMeta[]> {
  const res = await fetch(`${BASE}/featured`);
  if (!res.ok) throw new Error('Failed to fetch featured media');
  const data = await res.json();
  return data.assets ?? data;
}

export async function fetchMediaStats(): Promise<MediaStats> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch media stats');
  return res.json();
}

export async function uploadMediaAsset(
  file: File,
  body: CreateMediaBody
): Promise<MediaAssetWithMeta> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', body.name);
  if (body.category) formData.append('category', body.category);
  if (body.source) formData.append('source', body.source);
  if (body.sourceUrl) formData.append('sourceUrl', body.sourceUrl);
  if (body.attribution) formData.append('attribution', body.attribution);
  if (body.productId) formData.append('productId', body.productId);
  const res = await fetch(BASE, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload media asset');
  return res.json();
}

export async function updateMediaAsset(
  id: string,
  body: UpdateMediaBody
): Promise<MediaAssetWithMeta> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update media asset');
  return res.json();
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete media asset');
}

export async function toggleFavorite(id: string): Promise<MediaAssetWithMeta> {
  const res = await fetch(`${BASE}/${id}/favorite`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

export async function toggleArchive(id: string): Promise<MediaAssetWithMeta> {
  const res = await fetch(`${BASE}/${id}/archive`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle archive');
  return res.json();
}

export async function toggleFeatured(id: string): Promise<MediaAssetWithMeta> {
  const res = await fetch(`${BASE}/${id}/featured`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle featured');
  return res.json();
}

export async function importFromUrl(body: ImportUrlBody): Promise<ImportUrlResponse> {
  const res = await fetch(`${BASE}/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to import from URL');
  return res.json();
}

// ─── Bulk Operations ─────────────────────────────────────────

export async function bulkUploadMedia(files: File[]): Promise<MediaAssetWithMeta[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await fetch(`${BASE}/bulk`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to bulk upload');
  const data = await res.json();
  return data.assets ?? data;
}

export async function bulkDeleteMedia(ids: string[]): Promise<void> {
  const res = await fetch(`${BASE}/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to bulk delete');
}

// ─── Tags ────────────────────────────────────────────────────

export async function fetchMediaTags(): Promise<MediaTagWithCount[]> {
  const res = await fetch(`${BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch media tags');
  const data = await res.json();
  return data.tags ?? data;
}

export async function createMediaTag(body: CreateTagBody): Promise<MediaTagWithCount> {
  const res = await fetch(`${BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create tag');
  return res.json();
}

export async function updateMediaTag(id: string, body: UpdateTagBody): Promise<MediaTagWithCount> {
  const res = await fetch(`${BASE}/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update tag');
  return res.json();
}

export async function deleteMediaTag(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete tag');
}

// ─── Collections ─────────────────────────────────────────────

export async function fetchMediaCollections(): Promise<MediaCollectionWithMeta[]> {
  const res = await fetch(`${BASE}/collections`);
  if (!res.ok) throw new Error('Failed to fetch collections');
  const data = await res.json();
  return data.collections ?? data;
}

export async function fetchCollectionDetail(id: string): Promise<MediaCollectionDetail> {
  const res = await fetch(`${BASE}/collections/${id}`);
  if (!res.ok) throw new Error('Failed to fetch collection detail');
  return res.json();
}

export async function createCollection(body: CreateCollectionBody): Promise<MediaCollectionWithMeta> {
  const res = await fetch(`${BASE}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create collection');
  return res.json();
}

export async function updateCollection(
  id: string,
  body: UpdateCollectionBody
): Promise<MediaCollectionWithMeta> {
  const res = await fetch(`${BASE}/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update collection');
  return res.json();
}

export async function deleteCollection(id: string): Promise<void> {
  const res = await fetch(`${BASE}/collections/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete collection');
}

export async function addAssetToCollection(
  collectionId: string,
  assetId: string
): Promise<void> {
  const res = await fetch(`${BASE}/collections/${collectionId}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaAssetId: assetId }),
  });
  if (!res.ok) throw new Error('Failed to add asset to collection');
}

export async function removeAssetFromCollection(
  collectionId: string,
  assetId: string
): Promise<void> {
  const res = await fetch(`${BASE}/collections/${collectionId}/assets/${assetId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove asset from collection');
}

export async function reorderCollectionAssets(
  collectionId: string,
  assetIds: string[]
): Promise<void> {
  const res = await fetch(`${BASE}/collections/${collectionId}/assets`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder collection assets');
}

// ─── Stock Photos ────────────────────────────────────────────

export async function searchStockPhotos(
  query: string,
  page = 1,
  perPage = 15
): Promise<StockSearchResponse> {
  const sp = new URLSearchParams({ query, page: String(page), per_page: String(perPage) });
  const res = await fetch(`${BASE}/stock/search?${sp}`);
  if (!res.ok) throw new Error('Failed to search stock photos');
  return res.json();
}

export async function importStockPhoto(body: ImportStockBody): Promise<MediaAssetWithMeta> {
  const res = await fetch(`${BASE}/stock/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to import stock photo');
  const data = await res.json();
  return data.asset ?? data;
}

// ─── Style References ────────────────────────────────────────

export async function fetchStyleReferences(): Promise<StyleReferenceWithMeta[]> {
  const res = await fetch(`${BASE}/style-references`);
  if (!res.ok) throw new Error('Failed to fetch style references');
  const data = await res.json();
  return data.styleReferences ?? data;
}

export async function fetchStyleReferenceDetail(id: string): Promise<StyleReferenceWithMeta> {
  const res = await fetch(`${BASE}/style-references/${id}`);
  if (!res.ok) throw new Error('Failed to fetch style reference');
  return res.json();
}

export async function createStyleReference(
  body: CreateStyleReferenceBody
): Promise<StyleReferenceWithMeta> {
  const res = await fetch(`${BASE}/style-references`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create style reference');
  return res.json();
}

export async function updateStyleReference(
  id: string,
  body: UpdateStyleReferenceBody
): Promise<StyleReferenceWithMeta> {
  const res = await fetch(`${BASE}/style-references/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update style reference');
  return res.json();
}

export async function deleteStyleReference(id: string): Promise<void> {
  const res = await fetch(`${BASE}/style-references/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete style reference');
}

// ─── Brand Voices ────────────────────────────────────────────

export async function fetchBrandVoices(): Promise<BrandVoiceWithMeta[]> {
  const res = await fetch(`${BASE}/brand-voices`);
  if (!res.ok) throw new Error('Failed to fetch brand voices');
  const data = await res.json();
  return data.brandVoices ?? data;
}

export async function fetchBrandVoiceDetail(id: string): Promise<BrandVoiceWithMeta> {
  const res = await fetch(`${BASE}/brand-voices/${id}`);
  if (!res.ok) throw new Error('Failed to fetch brand voice');
  return res.json();
}

export async function createBrandVoice(body: CreateBrandVoiceBody): Promise<BrandVoiceWithMeta> {
  const res = await fetch(`${BASE}/brand-voices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create brand voice');
  return res.json();
}

export async function updateBrandVoice(
  id: string,
  body: UpdateBrandVoiceBody
): Promise<BrandVoiceWithMeta> {
  const res = await fetch(`${BASE}/brand-voices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update brand voice');
  return res.json();
}

export async function deleteBrandVoice(id: string): Promise<void> {
  const res = await fetch(`${BASE}/brand-voices/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete brand voice');
}

// ─── ElevenLabs Voices ──────────────────────────────────────

export async function fetchElevenLabsVoices(): Promise<{ voices: ElevenLabsVoice[]; error?: string }> {
  const res = await fetch(`${BASE}/brand-voices/voices`);
  if (!res.ok) throw new Error('Failed to fetch ElevenLabs voices');
  return res.json();
}

export async function generateBrandVoiceSample(
  id: string,
  text: string
): Promise<{ sampleAudioUrl: string }> {
  const res = await fetch(`${BASE}/brand-voices/${id}/generate-sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to generate voice sample');
  return res.json();
}

// ─── Sound Effects ──────────────────────────────────────────

export async function fetchSoundEffects(): Promise<SoundEffectWithMeta[]> {
  const res = await fetch(`${BASE}/sound-effects`);
  if (!res.ok) throw new Error('Failed to fetch sound effects');
  const data = await res.json();
  return data.soundEffects ?? data;
}

export async function fetchSoundEffectDetail(id: string): Promise<SoundEffectWithMeta> {
  const res = await fetch(`${BASE}/sound-effects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch sound effect detail');
  return res.json();
}

export async function uploadSoundEffect(
  file: File,
  body: CreateSoundEffectBody
): Promise<SoundEffectWithMeta> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', body.name);
  if (body.soundType) formData.append('soundType', body.soundType);
  const res = await fetch(`${BASE}/sound-effects`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload sound effect');
  return res.json();
}

export async function generateSoundEffectApi(
  body: GenerateSoundEffectBody
): Promise<SoundEffectWithMeta> {
  const res = await fetch(`${BASE}/sound-effects/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to generate sound effect');
  return res.json();
}

export async function updateSoundEffect(
  id: string,
  body: UpdateSoundEffectBody
): Promise<SoundEffectWithMeta> {
  const res = await fetch(`${BASE}/sound-effects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update sound effect');
  return res.json();
}

export async function deleteSoundEffect(id: string): Promise<void> {
  const res = await fetch(`${BASE}/sound-effects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete sound effect');
}

// ─── AI Images ──────────────────────────────────────────────

export async function fetchAiImages(
  favorite?: boolean
): Promise<GeneratedImageWithMeta[]> {
  const params = favorite ? '?favorite=true' : '';
  const res = await fetch(`${BASE}/ai-images${params}`);
  if (!res.ok) throw new Error('Failed to fetch AI images');
  const data = await res.json();
  return data.images ?? data;
}

export async function fetchAiImageDetail(
  id: string
): Promise<GeneratedImageWithMeta> {
  const res = await fetch(`${BASE}/ai-images/${id}`);
  if (!res.ok) throw new Error('Failed to fetch AI image');
  return res.json();
}

export async function generateAiImage(
  body: GenerateImageBody
): Promise<GeneratedImageWithMeta> {
  const res = await fetch(`${BASE}/ai-images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate image');
  }
  return res.json();
}

export async function updateAiImage(
  id: string,
  body: UpdateGeneratedImageBody
): Promise<GeneratedImageWithMeta> {
  const res = await fetch(`${BASE}/ai-images/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update AI image');
  return res.json();
}

export async function deleteAiImage(id: string): Promise<void> {
  const res = await fetch(`${BASE}/ai-images/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete AI image');
}
