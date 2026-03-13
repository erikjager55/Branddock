// =============================================================
// BrandFoundationStats — stat cards for the Brand Foundation
//
// Shows: Total Assets, Ready, Needs Attention, Avg Coverage
// Uses API-computed stats from context (real validation %).
// =============================================================

import React from 'react';
import { CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { useBrandAssets } from '@/contexts';

export function BrandFoundationStats() {
  const { stats } = useBrandAssets();

  return (
    <div data-testid="brand-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard label="Total Assets" value={stats?.total ?? 0} icon={Layers} />
      <StatCard label="Ready to Use" value={stats?.ready ?? 0} icon={CheckCircle} />
      <StatCard label="Need Attention" value={stats?.needValidation ?? 0} icon={AlertTriangle} />
      {/* Avg. Coverage hidden — validation % deactivated. Re-enable when methods return. */}
    </div>
  );
}
