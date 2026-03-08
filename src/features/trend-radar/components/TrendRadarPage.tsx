'use client';

import { Radar, PenLine, Sparkles } from 'lucide-react';
import { Button, Badge } from '@/components/shared';
import { useTrendRadarStore } from '../stores/useTrendRadarStore';
import { useTrends } from '../hooks';
import { TrendFilterBar } from './feed/TrendFilterBar';
import { TrendCardGrid } from './TrendCardGrid';
import { AddManualTrendModal } from './AddManualTrendModal';
import { AIResearchModal } from './research/AIResearchModal';
import { ResearchProgressModal } from './scan/ResearchProgressModal';

interface TrendRadarPageProps {
  onNavigate: (section: string) => void;
}

/** Trend Radar overview — header + filters + card grid */
export function TrendRadarPage({ onNavigate }: TrendRadarPageProps) {
  const { openAddManualTrendModal, openResearchModal } = useTrendRadarStore();
  const { data } = useTrends();
  const totalCount = data?.total ?? 0;

  const handleTrendClick = (id: string) => {
    useTrendRadarStore.getState().setSelectedTrendId(id);
    onNavigate('trend-detail');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-600 shadow-lg shadow-purple-200/50">
            <Radar className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Trend Radar</h1>
              {totalCount > 0 && (
                <Badge variant="default">{totalCount}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Discover and track market trends with AI research
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={PenLine} onClick={openAddManualTrendModal}>
            Add Trend
          </Button>
          <Button variant="primary" size="sm" icon={Sparkles} onClick={openResearchModal}>
            AI Research
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TrendFilterBar />

      {/* Card Grid */}
      <TrendCardGrid onTrendClick={handleTrendClick} />

      {/* Modals */}
      <AddManualTrendModal />
      <AIResearchModal />
      <ResearchProgressModal />
    </div>
  );
}
