'use client';

import React, { useMemo, useState } from 'react';
import { Search, ImageIcon, Loader2 } from 'lucide-react';
import { useMediaAssets } from '@/features/media-library/hooks';
import type { InsertImageTabProps } from './types';
import type { MediaAssetWithMeta } from '@/features/media-library/types/media.types';

/**
 * Library tab — browse existing IMAGE-type MediaAssets in the workspace
 * and pick one for the canvas. No upload here; this is select-from-existing.
 */
export function LibraryTab({ onSelected }: InsertImageTabProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useMediaAssets({
    mediaType: 'IMAGE',
    search: search.trim() || undefined,
    limit: 60,
  });

  const assets = useMemo<MediaAssetWithMeta[]>(() => data?.assets ?? [], [data]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search media library..."
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-colors"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && assets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {search ? `No images match "${search}"` : 'No images in your media library yet'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Use Upload, Import URL, Stock Photos, or Generate Image to add one
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && assets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() =>
                onSelected({
                  url: asset.fileUrl,
                  mediaAssetId: asset.id,
                  alt: asset.name ?? undefined,
                })
              }
              className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              title={asset.name ?? 'Untitled image'}
            >
              <img
                src={asset.thumbnailUrl ?? asset.fileUrl}
                alt={asset.name ?? ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
