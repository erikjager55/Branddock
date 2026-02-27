'use client';

import { FlaskConical, Bot, MessageCircle, ClipboardList, Wrench, CheckCircle, Plus, Eye, Play } from 'lucide-react';
import type { BrandAssetDetail } from '../../types/brand-asset-detail.types';

interface AssetResearchSidebarCardProps {
  asset: BrandAssetDetail;
  onStartAnalysis?: () => void;
  onStartInterviews?: () => void;
  onStartWorkshop?: () => void;
  isLocked?: boolean;
}

const METHODS = [
  { method: 'AI_EXPLORATION' as const, label: 'AI Exploration', description: 'AI-assisted analysis and ideation for brand strategy and positioning', icon: Bot, isFree: true },
  { method: 'INTERVIEWS' as const, label: 'Interviews', description: 'One-on-one deep-dive interviews with key stakeholders and customers', icon: MessageCircle, isFree: false },
  { method: 'WORKSHOP' as const, label: 'Canvas Workshop', description: 'Collaborative workshop sessions using strategic frameworks', icon: Wrench, isFree: false, priceLabel: 'From $1,200' },
  { method: 'QUESTIONNAIRE' as const, label: 'Questionnaire', description: 'Comprehensive surveys for quantitative validation insights', icon: ClipboardList, isFree: false, priceLabel: 'From $500' },
];

export function AssetResearchSidebarCard({ asset, onStartAnalysis, onStartInterviews, onStartWorkshop, isLocked = false }: AssetResearchSidebarCardProps) {
  const methods = asset.researchMethods ?? [];
  const completedMethods = methods.filter(m => m.status === 'COMPLETED' || m.status === 'VALIDATED').length;
  const totalMethods = METHODS.length;

  const getMethodStatus = (method: string) => {
    const m = methods.find(rm => rm.method === method);
    return m?.status ?? 'AVAILABLE';
  };

  const handleStart = (method: string) => {
    if (method === 'AI_EXPLORATION') onStartAnalysis?.();
    else if (method === 'INTERVIEWS') onStartInterviews?.();
    else if (method === 'WORKSHOP' || method === 'QUESTIONNAIRE') onStartWorkshop?.();
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          Validation Methods ({completedMethods}/{totalMethods})
        </h3>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${totalMethods > 0 ? (completedMethods / totalMethods) * 100 : 0}%` }}
        />
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
                    <h4 className="text-sm font-semibold text-gray-900">{config.label}</h4>
                    {isAvailable && (
                      <button
                        onClick={() => handleStart(config.method)}
                        disabled={isLocked}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3" />
                        Start
                      </button>
                    )}
                    {isCompleted && (
                      <button
                        onClick={() => handleStart(config.method)}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-emerald-700 border border-emerald-200 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        <Eye className="h-3 w-3" />
                        View Results
                      </button>
                    )}
                    {isInProgress && (
                      <button
                        onClick={() => handleStart(config.method)}
                        disabled={isLocked}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-blue-700 border border-blue-200 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Play className="h-3 w-3" />
                        Continue
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{config.description}</p>
                  {!isCompleted && config.isFree && (
                    <span className="text-[11px] font-medium text-emerald-600 mt-1 block">FREE</span>
                  )}
                  {!isCompleted && config.priceLabel && (
                    <span className="text-[11px] font-medium text-gray-500 mt-1 block">{config.priceLabel}</span>
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
