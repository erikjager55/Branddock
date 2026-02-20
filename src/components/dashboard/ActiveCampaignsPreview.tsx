import React from 'react';
import { Megaphone, ArrowRight, Plus } from 'lucide-react';
import { useCampaignsPreview } from '../../hooks/use-dashboard';
import { Badge, ProgressBar, Skeleton } from '../shared';

interface ActiveCampaignsPreviewProps {
  onNavigate: (section: string) => void;
}

export function ActiveCampaignsPreview({ onNavigate }: ActiveCampaignsPreviewProps) {
  const { data, isLoading } = useCampaignsPreview();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="py-3">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="campaigns-preview" className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Active Campaigns</h3>
        </div>
        <button
          onClick={() => onNavigate('active-campaigns')}
          className="text-xs text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((campaign) => (
            <div key={campaign.id} className="py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900 truncate">{campaign.title}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <Badge variant={campaign.type === 'Strategic' ? 'teal' : 'info'} size="sm">
                    {campaign.type}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    value={campaign.deliverableProgress}
                    color="emerald"
                    size="sm"
                  />
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {campaign.deliverableProgress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-4 text-center">No active campaigns yet</p>
      )}

      <button
        onClick={() => onNavigate('campaign-wizard')}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-green-200 text-green-600 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Start New Campaign
      </button>
    </div>
  );
}
