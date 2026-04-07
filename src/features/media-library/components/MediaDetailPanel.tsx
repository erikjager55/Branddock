'use client';

import React from 'react';
import {
  X,
  Heart,
  Trash2,
  Download,
  Star,
  FolderPlus,
} from 'lucide-react';
import { Skeleton } from '@/components/shared';
import { useMediaAssetDetail, useUpdateMediaAsset } from '../hooks';
import { useMediaLibraryStore } from '../stores/useMediaLibraryStore';
import {
  MEDIA_TYPE_ICONS,
  MEDIA_CATEGORY_CONFIG,
  formatFileSize,
  formatDuration,
} from '../constants/media-constants';
import type { MediaAssetDetailResponse } from '../types/media.types';
import { TagInput } from './tags/TagInput';

// ─── Types ──────────────────────────────────────────────────

interface MediaDetailPanelProps {
  assetId: string | null;
  onClose: () => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Loading Skeleton ───────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="rounded-lg" width="100%" height={256} />
      <div className="space-y-3">
        <Skeleton className="rounded" width="80%" height={14} />
        <Skeleton className="rounded" width="60%" height={12} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="rounded" width="50%" height={10} />
            <Skeleton className="rounded" width="80%" height={14} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="rounded-full" width={64} height={24} />
        ))}
      </div>
    </div>
  );
}

// ─── Preview Renderer ───────────────────────────────────────

function AssetPreview({ asset }: { asset: MediaAssetDetailResponse }) {
  const typeConfig = MEDIA_TYPE_ICONS[asset.mediaType];
  const Icon = typeConfig.icon;

  if (asset.mediaType === 'IMAGE') {
    return (
      <img
        src={asset.fileUrl}
        alt={asset.name}
        className="max-h-64 w-full object-contain rounded-lg bg-gray-50"
      />
    );
  }

  if (asset.mediaType === 'VIDEO') {
    return (
      <video
        src={asset.fileUrl}
        controls
        className="max-h-64 w-full rounded-lg bg-black"
      >
        <track kind="captions" />
      </video>
    );
  }

  return (
    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
      <Icon className={`w-16 h-16 ${typeConfig.color}`} />
    </div>
  );
}

// ─── Metadata Grid Item ─────────────────────────────────────

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

/** Slide-out detail panel for a selected media asset */
export function MediaDetailPanel({
  assetId,
  onClose,
  onFavorite,
  onDelete,
}: MediaDetailPanelProps) {
  const { data, isLoading } = useMediaAssetDetail(assetId ?? '');
  const updateAsset = useUpdateMediaAsset(assetId ?? '');
  const openAddToCollection = useMediaLibraryStore((s) => s.openAddToCollection);

  const asset = data as MediaAssetDetailResponse | undefined;

  const handleTagsChange = (tagIds: string[]) => {
    if (!assetId) return;
    updateAsset.mutate({ tagIds });
  };

  return (
    <>
      {/* Backdrop overlay */}
      {assetId && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          assetId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {assetId && (
          <div className="overflow-y-auto h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate pr-2">
                {isLoading ? (
                  <Skeleton className="rounded" width={180} height={20} />
                ) : (
                  asset?.name ?? 'Media Asset'
                )}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoading ? (
              <DetailSkeleton />
            ) : asset ? (
              <>
                {/* Preview */}
                <div className="p-4">
                  <AssetPreview asset={asset} />
                </div>

                {/* Metadata */}
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <MetadataItem
                      label="Type"
                      value={MEDIA_TYPE_ICONS[asset.mediaType].label}
                    />
                    <MetadataItem
                      label="Category"
                      value={MEDIA_CATEGORY_CONFIG[asset.category].label}
                    />
                    <MetadataItem
                      label="File Size"
                      value={formatFileSize(asset.fileSize)}
                    />
                    {asset.width != null && asset.height != null && (
                      <MetadataItem
                        label="Dimensions"
                        value={`${asset.width} x ${asset.height}`}
                      />
                    )}
                    {asset.duration != null && (
                      <MetadataItem
                        label="Duration"
                        value={formatDuration(asset.duration)}
                      />
                    )}
                    <MetadataItem
                      label="Created"
                      value={new Date(asset.createdAt).toLocaleDateString(
                        'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-500 mb-2">Tags</p>
                  <TagInput
                    selectedTagIds={asset.tags.map((t) => t.mediaTag.id)}
                    onChange={handleTagsChange}
                  />
                </div>

                {/* Collections */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500">Collections</p>
                    <button
                      type="button"
                      onClick={() => openAddToCollection(asset.id)}
                      className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                  {asset.collections.length > 0 ? (
                    <div className="space-y-1">
                      {asset.collections.map((c) => (
                        <div
                          key={c.id}
                          className="text-sm text-gray-700 flex items-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 text-gray-400" />
                          {c.collection.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No collections yet</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-gray-200 mt-auto flex-shrink-0 space-y-2">
                  <button
                    onClick={() => {
                      if (asset.fileUrl) {
                        window.open(asset.fileUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onFavorite(asset.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border ${
                        asset.isFavorite
                          ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                          : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          asset.isFavorite ? 'fill-red-500' : ''
                        }`}
                      />
                      {asset.isFavorite ? 'Favorited' : 'Favorite'}
                    </button>
                    <button
                      onClick={() => onDelete(asset.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

export default MediaDetailPanel;
