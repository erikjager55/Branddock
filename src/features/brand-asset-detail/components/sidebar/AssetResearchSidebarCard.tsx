'use client';

import { FlaskConical, Bot, CheckCircle, Plus, Eye, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';

interface AssetResearchSidebarCardProps {
  asset: BrandAssetDetail;
  onStartAnalysis?: () => void;
  isLocked?: boolean;
}

/** Only AI Exploration is currently active. Other methods (INTERVIEWS, WORKSHOP, QUESTIONNAIRE) are deactivated. */
const METHODS = [
  { method: 'AI_EXPLORATION' as const, tKey: 'aiExploration', icon: Bot, isFree: true },
  // Deactivated — re-add when methods return:
  // { method: 'INTERVIEWS' as const, tKey: 'interviews', ... },
  // { method: 'WORKSHOP' as const, tKey: 'workshop', ... },
  // { method: 'QUESTIONNAIRE' as const, tKey: 'questionnaire', ... },
];

export function AssetResearchSidebarCard({ asset, onStartAnalysis, isLocked = false }: AssetResearchSidebarCardProps) {
  const { t } = useTranslation('brand-asset-detail');
  const methods = asset.researchMethods ?? [];

  const getMethodStatus = (method: string) => {
    const m = methods.find(rm => rm.method === method);
    return m?.status ?? 'AVAILABLE';
  };

  const handleStart = (method: string) => {
    if (method === 'AI_EXPLORATION') onStartAnalysis?.();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{t('research.title')}</h3>
      </div>

      {/* Method cards */}
      <div className="space-y-2">
        {METHODS.map(config => {
          const status = getMethodStatus(config.method);
          const isCompleted = status === 'COMPLETED' || status === 'VALIDATED';
          const isInProgress = status === 'IN_PROGRESS';
          const isAvailable = !isCompleted && !isInProgress;
          const Icon = config.icon;

          // Hide non-started when locked
          if (isLocked && isAvailable) return null;

          return (
            <div
              key={config.method}
              data-testid={`research-method-${config.method.toLowerCase().replaceAll('_', '-')}`}
              className={`p-3 rounded-xl border border-dashed transition-colors ${
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCompleted ? 'bg-emerald-100' : isInProgress ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Icon className={`h-4 w-4 ${isInProgress ? 'text-blue-600' : 'text-gray-500'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{t(`research.${config.tKey}.label`)}</h4>
                    {isAvailable && (
                      <button
                        onClick={() => handleStart(config.method)}
                        disabled={isLocked}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3" />
                        {t(`research.${config.tKey}.start`)}
                      </button>
                    )}
                    {isCompleted && (
                      <button
                        onClick={() => handleStart(config.method)}
                        disabled={isLocked}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-emerald-700 border border-emerald-200 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Eye className="h-3 w-3" />
                        {t(`research.${config.tKey}.view`)}
                      </button>
                    )}
                    {isInProgress && (
                      <button
                        onClick={() => handleStart(config.method)}
                        disabled={isLocked}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-blue-700 border border-blue-200 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Play className="h-3 w-3" />
                        {t(`research.${config.tKey}.continue`)}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t(`research.${config.tKey}.description`)}</p>
                  {!isCompleted && config.isFree && (
                    <span className="text-[11px] font-medium text-emerald-600 mt-1 block">{t('research.free')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
