import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import type { AssetAuditScore } from '@/types/brand-alignment';

interface Props {
  assetScores: AssetAuditScore[];
  onNavigateToAsset?: (assetId: string) => void;
}

function qualityColor(score: number): string {
  if (score >= 8) return '#059669';
  if (score >= 6) return '#0d9488';
  if (score >= 4) return '#d97706';
  return '#dc2626';
}

function completenessColor(pct: number): string {
  if (pct >= 80) return '#059669';
  if (pct >= 60) return '#0d9488';
  if (pct >= 40) return '#d97706';
  return '#dc2626';
}

export function AuditAssetTable({ assetScores, onNavigateToAsset }: Props) {
  const { t } = useTranslation('brand-alignment');
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('auditTable.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('auditTable.subtitle')}
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {assetScores.map((asset) => (
          <div
            key={asset.assetId}
            className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => onNavigateToAsset?.(asset.assetId)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {asset.assetName}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Completeness pill */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{t('auditTable.complete')}</span>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: completenessColor(asset.completenessPercent),
                      backgroundColor: `${completenessColor(asset.completenessPercent)}15`,
                    }}
                  >
                    {asset.completenessPercent}%
                  </span>
                </div>

                {/* Quality pill */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{t('auditTable.quality')}</span>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: qualityColor(asset.qualityScore),
                      backgroundColor: `${qualityColor(asset.qualityScore)}15`,
                    }}
                  >
                    {asset.qualityScore}/10
                  </span>
                </div>
              </div>
            </div>

            {/* Summary + improvements */}
            <p className="text-xs text-gray-500 mb-1">
              {asset.qualitySummary}
            </p>
            {Array.isArray(asset.improvements) && asset.improvements.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {asset.improvements.map((imp, i) => (
                  <span
                    key={i}
                    className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full"
                  >
                    {imp}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
