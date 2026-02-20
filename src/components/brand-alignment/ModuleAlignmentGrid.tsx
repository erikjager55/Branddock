import React from 'react';
import type { ModuleScoreData } from '@/types/brand-alignment';
import { SkeletonCard } from '@/components/shared';
import { TYPOGRAPHY } from '@/lib/constants/design-tokens';
import { ModuleScoreCard } from './ModuleScoreCard';

// ─── Types ──────────────────────────────────────────────────

interface ModuleAlignmentGridProps {
  modules: ModuleScoreData[];
  isLoading: boolean;
  onNavigate?: (route: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function ModuleAlignmentGrid({
  modules,
  isLoading,
  onNavigate,
}: ModuleAlignmentGridProps) {
  return (
    <div data-testid="module-alignment-grid" className="mb-8">
      <h2 className={`${TYPOGRAPHY.sectionHeading} mb-4`}>Module Scores</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => (
            <ModuleScoreCard
              key={m.id}
              module={m}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
