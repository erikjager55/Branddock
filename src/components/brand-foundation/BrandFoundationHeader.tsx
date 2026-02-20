// =============================================================
// BrandFoundationHeader — page header with title, count, add button
//
// Shared primitives: Button, Badge
// =============================================================

import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { Button, Badge } from '@/components/shared';
import { useBrandAssets } from '@/contexts';
import { useBrandAssetStore } from '@/stores/useBrandAssetStore';

export function BrandFoundationHeader() {
  const { brandAssets } = useBrandAssets();
  const setCreateModalOpen = useBrandAssetStore((s) => s.setCreateModalOpen);

  return (
    <div className="flex items-start justify-between">
      {/* Left: icon + title */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Foundation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Build your strategic foundation with premium brand tools
          </p>
        </div>
      </div>

      {/* Right: count badge + add button */}
      <div className="flex items-center gap-3">
        <Badge>{brandAssets.length} assets</Badge>
        <Button variant="cta" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          Add Asset
        </Button>
      </div>
    </div>
  );
}
