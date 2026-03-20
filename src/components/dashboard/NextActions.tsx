import React from 'react';
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileText,
  Users,
  Layers,
  TrendingUp,
  Target,
  Megaphone,
  Circle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRecommendedActions, dashboardKeys } from '../../hooks/use-dashboard';
import { Skeleton } from '../shared';
import { useBrandAssetStore } from '../../stores/useBrandAssetStore';
import { usePersonaDetailStore } from '../../features/personas/stores/usePersonaDetailStore';
import { useCompetitorsStore } from '../../features/competitors/stores/useCompetitorsStore';
import { useTrendRadarStore } from '../../features/trend-radar/stores/useTrendRadarStore';
import { useCampaignStore } from '../../features/campaigns/stores/useCampaignStore';
import type { RecommendedAction } from '../../types/dashboard';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Users,
  Layers,
  TrendingUp,
  Target,
  Megaphone,
};

function getIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || Circle;
}

function navigateToAction(action: RecommendedAction, onNavigate: (section: string) => void) {
  if (action.entityId && action.entityType) {
    switch (action.entityType) {
      case 'brand-asset':
        useBrandAssetStore.getState().setSelectedAssetId(action.entityId);
        break;
      case 'persona':
        usePersonaDetailStore.getState().setSelectedPersonaId(action.entityId);
        break;
      case 'competitor':
        useCompetitorsStore.getState().setSelectedCompetitorId(action.entityId);
        break;
      case 'trend':
        useTrendRadarStore.getState().setSelectedTrendId(action.entityId);
        break;
      case 'campaign':
        useCampaignStore.getState().setSelectedCampaignId(action.entityId);
        break;
    }
  }
  onNavigate(action.actionHref);
}

interface NextActionsProps {
  onNavigate: (section: string) => void;
}

export function NextActions({ onNavigate }: NextActionsProps) {
  const { data, isLoading, isError } = useRecommendedActions();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48 mb-2" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-full mb-3" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-5">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load recommendations</span>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: dashboardKeys.recommended })}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommended Next Steps</h3>
      <div className="space-y-3">
        {data.map((action) => {
          const Icon = getIcon(action.icon);
          return (
            <div
              key={action.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                      <Sparkles className="h-2.5 w-2.5" />
                      {action.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 mb-0.5">{action.title}</h4>
                  <p className="text-xs text-gray-500 mb-3">{action.description}</p>
                  <button
                    onClick={() => navigateToAction(action, onNavigate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    {action.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
