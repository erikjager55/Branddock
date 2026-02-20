// =============================================================
// BrandFoundationStats — stat cards for the Brand Foundation
//
// Shows: Total Assets, Ready, Needs Attention, Avg Coverage
// Uses shared StatCard primitive.
// =============================================================

import React, { useMemo } from 'react';
import { CheckCircle, AlertTriangle, Layers, BarChart3 } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { useBrandAssets } from '@/contexts';
import { mockToMeta } from '@/lib/api/mock-to-meta-adapter';

export function BrandFoundationStats() {
  const { brandAssets } = useBrandAssets();

  const stats = useMemo(() => {
    const assets = brandAssets.map(mockToMeta);

    const ready = assets.filter((a) => a.status === 'READY').length;
    const needsAttention = assets.filter(
      (a) => a.status === 'NEEDS_ATTENTION' || a.status === 'DRAFT',
    ).length;
    const inProgress = assets.filter((a) => a.status === 'IN_PROGRESS').length;

    const avgCoverage =
      assets.length > 0
        ? Math.round(
            assets.reduce((sum, a) => sum + a.coveragePercentage, 0) / assets.length,
          )
        : 0;

    return { total: assets.length, ready, needsAttention: needsAttention + inProgress, avgCoverage };
  }, [brandAssets]);

  return (
    <div data-testid="brand-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Assets" value={stats.total} icon={Layers} />
      <StatCard label="Ready to Use" value={stats.ready} icon={CheckCircle} />
      <StatCard label="Need Attention" value={stats.needsAttention} icon={AlertTriangle} />
      <StatCard label="Avg. Coverage" value={`${stats.avgCoverage}%`} icon={BarChart3} />
    </div>
  );
}
