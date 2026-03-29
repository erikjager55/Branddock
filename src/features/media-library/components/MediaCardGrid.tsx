'use client';

import type { MediaAssetWithMeta } from '../types/media.types';
import { MediaAssetCard } from './MediaAssetCard';

interface MediaCardGridProps {
  assets: MediaAssetWithMeta[];
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Responsive 3-column grid of media asset cards. */
export function MediaCardGrid({ assets, onSelect, onFavorite, onDelete }: MediaCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((asset) => (
        <MediaAssetCard
          key={asset.id}
          asset={asset}
          onClick={() => onSelect(asset.id)}
          onFavorite={() => onFavorite(asset.id)}
          onDelete={() => onDelete(asset.id)}
        />
      ))}
    </div>
  );
}
