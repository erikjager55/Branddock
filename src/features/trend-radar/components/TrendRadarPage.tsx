'use client';

import { Radar, Plus, PenLine, ScanSearch } from 'lucide-react';
import { Button } from '@/components/shared';
import { useTrendRadarStore } from '../stores/useTrendRadarStore';
import { useStartScan } from '../hooks';
import { TrendRadarStats } from './TrendRadarStats';
import { TrendRadarTabs } from './TrendRadarTabs';
import { SourcesPanel } from './sources/SourcesPanel';
import { AddSourceModal } from './sources/AddSourceModal';
import { EditSourceModal } from './sources/EditSourceModal';
import { TrendFeedPanel } from './feed/TrendFeedPanel';
import { AlertsPanel } from './alerts/AlertsPanel';
import { ActivationPanel } from './activation/ActivationPanel';
import { ScanProgressModal } from './scan/ScanProgressModal';
import { AddManualTrendModal } from './AddManualTrendModal';

interface TrendRadarPageProps {
  onNavigate: (section: string) => void;
}

export function TrendRadarPage({ onNavigate }: TrendRadarPageProps) {
  const {
    activeTab,
    openAddSourceModal,
    openAddManualTrendModal,
    openScanProgressModal,
    setScanJobId,
  } = useTrendRadarStore();

  const startScanMutation = useStartScan();

  const handleScanNow = async () => {
    try {
      const job = await startScanMutation.mutateAsync(undefined);
      setScanJobId(job.id);
      openScanProgressModal();
    } catch {
      // Error handled by mutation
    }
  };

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
            <p className="text-sm text-gray-500">Monitor market trends from your sources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Plus} onClick={openAddSourceModal}>
            Add Source
          </Button>
          <Button variant="secondary" size="sm" icon={PenLine} onClick={openAddManualTrendModal}>
            Add Trend
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={ScanSearch}
            onClick={handleScanNow}
            isLoading={startScanMutation.isPending}
          >
            Scan Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TrendRadarStats />

      {/* Tabs */}
      <TrendRadarTabs />

      {/* Tab content */}
      {activeTab === 'sources' && <SourcesPanel />}
      {activeTab === 'feed' && <TrendFeedPanel onTrendClick={handleTrendClick} />}
      {activeTab === 'alerts' && <AlertsPanel onTrendClick={handleTrendClick} />}
      {activeTab === 'activate' && <ActivationPanel onTrendClick={handleTrendClick} />}

      {/* Modals */}
      <AddSourceModal />
      <EditSourceModal />
      <AddManualTrendModal />
      <ScanProgressModal />
    </div>
  );
}
