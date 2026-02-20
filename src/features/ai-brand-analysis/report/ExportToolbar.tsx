'use client';

import React from 'react';
import { Lock, Unlock, FileDown, Database } from 'lucide-react';
import { Button } from '@/components/shared';
import { useToggleLock } from '../hooks/useAIAnalysis';

interface ExportToolbarProps {
  assetId: string;
  sessionId: string;
  isLocked: boolean;
}

export function ExportToolbar({ assetId, sessionId, isLocked }: ExportToolbarProps) {
  const lockMutation = useToggleLock(assetId, sessionId);

  const handleToggleLock = () => {
    lockMutation.mutate();
  };

  const handleExportRaw = async () => {
    try {
      const res = await fetch(
        `/api/brand-assets/${assetId}/ai-analysis/${sessionId}/report/raw`,
      );
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand-analysis-${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isLocked ? 'primary' : 'secondary'}
        size="sm"
        icon={isLocked ? Lock : Unlock}
        onClick={handleToggleLock}
        isLoading={lockMutation.isPending}
      >
        {isLocked ? 'Locked' : 'Lock'}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={Database}
        onClick={handleExportRaw}
      >
        Raw Data
      </Button>
    </div>
  );
}
