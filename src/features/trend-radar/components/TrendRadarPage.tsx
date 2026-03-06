'use client';

import { Radar, PenLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';
import { useTrendRadarStore } from '../stores/useTrendRadarStore';
import { TrendRadarStats } from './TrendRadarStats';
import { TrendRadarTabs } from './TrendRadarTabs';
import { TrendFeedPanel } from './feed/TrendFeedPanel';
import { AlertsPanel } from './alerts/AlertsPanel';
import { ActivationPanel } from './activation/ActivationPanel';
import { AIResearchModal } from './research/AIResearchModal';
import { ResearchProgressModal } from './scan/ResearchProgressModal';
import { AddManualTrendModal } from './AddManualTrendModal';

interface TrendRadarPageProps {
  onNavigate: (section: string) => void;
}

export function TrendRadarPage({ onNavigate }: TrendRadarPageProps) {
  const {
    activeTab,
    openAddManualTrendModal,
    openResearchModal,
  } = useTrendRadarStore();

  const handleTrendClick = (id: string) => {
    useTrendRadarStore.getState().setSelectedTrendId(id);
    onNavigate('trend-detail');
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600">
            <Radar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trend Radar</h1>
            <p className="text-sm text-gray-500">Discover market trends with AI research</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={PenLine} onClick={openAddManualTrendModal}>
            Add Trend
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            onClick={openResearchModal}
          >
            AI Research
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TrendRadarStats />

      {/* Tabs */}
      <TrendRadarTabs />

      {/* Tab content */}
      {activeTab === 'feed' && <TrendFeedPanel onTrendClick={handleTrendClick} />}
      {activeTab === 'alerts' && <AlertsPanel onTrendClick={handleTrendClick} />}
      {activeTab === 'activate' && <ActivationPanel onTrendClick={handleTrendClick} />}

      {/* Modals */}
      <AddManualTrendModal />
      <AIResearchModal />
      <ResearchProgressModal />
    </div>
  );
}
