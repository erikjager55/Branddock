'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, Search, Check, X, Image as ImageIcon } from 'lucide-react';
import { useMediaAssets } from '@/features/media-library/hooks';
import { selectCanvasVisualFromLibrary } from '../../api/canvas.api';
import { useCanvasStore } from '../../stores/useCanvasStore';
import type { MediaAssetWithMeta } from '@/features/media-library/types/media.types';
import type { CanvasImageVariant } from '../../types/canvas.types';
import { setHeroImage as persistHeroImage } from '../../api/canvas.api';

interface LibraryAssetPickerProps {
  deliverableId: string;
  onCancel?: () => void;
  /** Called after a successful pick — used by Step 2 to dismiss the picker. */
  onPicked?: () => void;
}

const MAX_PICKS = 3;

/**
 * Inline picker for selecting 1-3 existing MediaAssets as the
 * deliverable's image variants. Wired to Visual Brief source = 'library'
 * — replaces the AI generation flow with a curated selection from the
 * workspace media library.
 *
 * Filters scoped to mediaType = IMAGE (videos / audio aren't image
 * variants); user can narrow further via the search input. Selection
 * order is preserved — the first picked asset becomes the default
 * (and gets promoted to hero image, mirroring the generate flow).
 */
export function LibraryAssetPicker({ deliverableId, onCancel, onPicked }: LibraryAssetPickerProps) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);

  // Always image-type — videos / audio aren't valid image variants.
  // Cap at 60 results in the picker; if user needs more they should
  // narrow via search.
  const { data, isLoading } = useMediaAssets({
    mediaType: 'IMAGE',
    isArchived: false,
    search: search.trim() || undefined,
    limit: 60,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const assets = useMemo(() => data?.assets ?? [], [data]);

  const togglePick = (assetId: string) => {
    setPicked((prev) => {
      if (prev.includes(assetId)) {
        return prev.filter((id) => id !== assetId);
      }
      if (prev.length >= MAX_PICKS) {
        // Replace the oldest pick when over the cap — keeps selection
        // stable without needing a "max reached" toast.
        return [...prev.slice(1), assetId];
      }
      return [...prev, assetId];
    });
  };

  const handleConfirm = async () => {
    if (picked.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await selectCanvasVisualFromLibrary(deliverableId, picked);
      const mapped: CanvasImageVariant[] = result.variants.map((v, i) => ({
        index: i,
        url: v.url,
        prompt: v.prompt,
        isSelected: i === 0,
      }));
      setImageVariants(mapped);
      // Auto-promote the first pick to hero image so Step 3 (Medium)
      // shows it immediately — same pattern as the generate flow.
      const firstAsset = assets.find((a) => a.id === picked[0]);
      if (firstAsset) {
        setHeroImage({
          url: firstAsset.fileUrl,
          mediaAssetId: firstAsset.id,
          alt: firstAsset.name,
        });
        persistHeroImage(deliverableId, {
          imageUrl: firstAsset.fileUrl,
          imageSource: 'library',
          mediaAssetId: firstAsset.id,
          alt: firstAsset.aiDescription ?? firstAsset.name ?? null,
        }).catch((err) => {
          console.error('[Library] hero image persist failed', err);
        });
      }
      onPicked?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select assets';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, tag, or description..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
      </div>

      {/* Empty / loading / grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading library...
        </div>
      ) : assets.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-1">
          {assets.map((asset) => {
            const idx = picked.indexOf(asset.id);
            const isPicked = idx >= 0;
            return (
              <AssetTile
                key={asset.id}
                asset={asset}
                isPicked={isPicked}
                pickIndex={idx}
                onClick={() => togglePick(asset.id)}
              />
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {picked.length === 0
            ? `Pick up to ${MAX_PICKS} images`
            : `${picked.length} of ${MAX_PICKS} selected`}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={picked.length === 0 || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Use {picked.length || ''} selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetTile({
  asset,
  isPicked,
  pickIndex,
  onClick,
}: {
  asset: MediaAssetWithMeta;
  isPicked: boolean;
  pickIndex: number;
  onClick: () => void;
}) {
  const thumbUrl = asset.thumbnailUrl ?? asset.fileUrl;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-md overflow-hidden border-2 transition-all aspect-square bg-gray-50"
      style={{ borderColor: isPicked ? '#0d9488' : '#e5e7eb' }}
    >
      <img
        src={thumbUrl}
        alt={asset.name}
        className="w-full h-full object-cover"
      />
      {isPicked && (
        <div className="absolute top-1 right-1 rounded-full bg-teal-600 w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold shadow">
          {pickIndex + 1}
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
        <p className="text-[10px] text-white truncate">{asset.name}</p>
      </div>
    </button>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
      <div className="rounded-full bg-gray-100 p-3">
        <ImageIcon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-600 font-medium">No images found</p>
      <p className="text-xs text-gray-500 max-w-xs">
        {search.trim()
          ? `No assets match "${search.trim()}". Try a different search or clear the filter.`
          : 'Your media library is empty. Upload images via the Media Library section, then return here to pick them.'}
      </p>
    </div>
  );
}
