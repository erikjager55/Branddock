'use client';

import { FileText } from 'lucide-react';
import { exportBrandAssetPdf } from '../../utils/exportBrandAssetPdf';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';

interface AssetQuickActionsCardProps {
  asset: BrandAssetDetail;
}

export function AssetQuickActionsCard({ asset }: AssetQuickActionsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-1.5">
        <button
          onClick={() => exportBrandAssetPdf(asset)}
          className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-left transition-colors hover:bg-gray-50"
        >
          <div className="h-7 w-7 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-gray-600" />
          </div>
          <span className="text-xs font-medium text-gray-700">
            Export PDF
          </span>
        </button>
      </div>
    </div>
  );
}
