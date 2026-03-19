'use client';

import { useState } from 'react';
import { Link2, Plus, Search, X, Megaphone } from 'lucide-react';
import { Button, Badge, EmptyState } from '@/components/shared';
import { useLinkCampaign, useUnlinkCampaign, useSearchCampaigns } from '../../hooks';
import type { LinkedCampaignItem } from '../../types/business-strategy.types';

interface LinkedCampaignsSectionProps {
  strategyId: string;
  linkedCampaigns: LinkedCampaignItem[];
  canEdit: boolean;
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  COMPLETED: 'default',
  ARCHIVED: 'warning',
};

export function LinkedCampaignsSection({
  strategyId,
  linkedCampaigns,
  canEdit,
}: LinkedCampaignsSectionProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const linkCampaign = useLinkCampaign(strategyId);
  const unlinkCampaign = useUnlinkCampaign(strategyId);
  const { data: searchResults } = useSearchCampaigns(searchQuery);

  const linkedIds = new Set(linkedCampaigns.map((lc) => lc.campaignId));

  const availableCampaigns = (searchResults?.campaigns ?? []).filter(
    (c) => !linkedIds.has(c.id),
  );

  const handleLink = (campaignId: string) => {
    linkCampaign.mutate(campaignId, {
      onSuccess: () => {
        setSearchQuery('');
        setIsSearchOpen(false);
      },
    });
  };

  const handleUnlink = (campaignId: string) => {
    unlinkCampaign.mutate(campaignId);
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Linked Campaigns</h2>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {isSearchOpen ? 'Close' : 'Link Campaign'}
          </Button>
        )}
      </div>

      {/* Search panel */}
      {isSearchOpen && (
        <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              autoFocus
            />
          </div>

          {availableCampaigns.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {availableCampaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleLink(c.id)}
                  disabled={linkCampaign.isPending}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg hover:bg-white transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-900">{c.title}</span>
                    <Badge variant="default" size="sm">{c.type}</Badge>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          ) : searchQuery.length > 0 ? (
            <p className="text-sm text-gray-400 italic px-3 py-2">No matching campaigns found</p>
          ) : (
            <p className="text-sm text-gray-400 italic px-3 py-2">Type to search campaigns</p>
          )}
        </div>
      )}

      {/* Linked campaigns list */}
      {linkedCampaigns.length > 0 ? (
        <div className="space-y-2">
          {linkedCampaigns.map((lc) => (
            <div
              key={lc.campaignId}
              className="flex items-center justify-between px-3 py-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{lc.title}</span>
                <Badge variant="default" size="sm">{lc.type}</Badge>
                <Badge variant={STATUS_COLORS[lc.status] ?? 'default'} size="sm">
                  {lc.status}
                </Badge>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleUnlink(lc.campaignId)}
                  disabled={unlinkCampaign.isPending}
                  className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Unlink campaign"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Link2}
          title="No campaigns linked yet"
          description="Link campaigns to track their alignment with this strategy."
        />
      )}
    </div>
  );
}
