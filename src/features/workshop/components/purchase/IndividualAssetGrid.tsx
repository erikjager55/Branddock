"use client";

import { IndividualAssetCard } from "./IndividualAssetCard";

interface Asset {
  id: string;
  name: string;
  category: string;
}

interface IndividualAssetGridProps {
  assets: Asset[];
  selectedAssetIds: string[];
  onToggle: (assetId: string) => void;
}

export function IndividualAssetGrid({
  assets,
  selectedAssetIds,
  onToggle,
}: IndividualAssetGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {assets.map((asset) => (
        <IndividualAssetCard
          key={asset.id}
          assetId={asset.id}
          name={asset.name}
          category={asset.category}
          isSelected={selectedAssetIds.includes(asset.id)}
          onToggle={() => onToggle(asset.id)}
        />
      ))}
    </div>
  );
}
