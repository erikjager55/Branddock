'use client';

import { Plus, Radar } from 'lucide-react';
import { Button, EmptyState } from '@/components/shared';

import { useSources, useDeleteSource, useToggleSourcePause } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { SourceCard } from './SourceCard';

export function SourcesPanel() {
  const { openAddSourceModal, openEditSourceModal } = useTrendRadarStore();
  const { data, isLoading } = useSources();
  const deleteMutation = useDeleteSource();
  const togglePauseMutation = useToggleSourcePause();

  const sources = data?.sources ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        icon={Radar}
        title="No trend sources yet"
        description="Add websites to monitor for market trends. The scanner will automatically detect new trends from these sources."
        action={{ label: 'Add First Source', onClick: openAddSourceModal }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{sources.length} source{sources.length !== 1 ? 's' : ''} configured</p>
        <Button variant="secondary" size="sm" icon={Plus} onClick={openAddSourceModal}>
          Add Source
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            onEdit={openEditSourceModal}
            onTogglePause={(id) => togglePauseMutation.mutate(id)}
            onDelete={(id) => {
              if (confirm('Delete this source? This will not delete detected trends.')) {
                deleteMutation.mutate(id);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
