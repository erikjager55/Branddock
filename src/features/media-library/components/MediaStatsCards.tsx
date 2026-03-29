'use client';

import { Image, ImageIcon, Video, FileText } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { SkeletonCard } from '@/components/shared';

// ─── Types ────────────────────────────────────────────────

interface MediaStatsCardsProps {
  stats?: {
    totalAssets: number;
    totalImages: number;
    totalVideos: number;
    totalDocuments: number;
    totalAudio: number;
  };
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────

/** Stats cards row showing 4 media library statistics */
export function MediaStatsCards({ stats, isLoading }: MediaStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Assets"
        value={stats?.totalAssets ?? 0}
        icon={Image}
      />
      <StatCard
        label="Images"
        value={stats?.totalImages ?? 0}
        icon={ImageIcon}
      />
      <StatCard
        label="Videos"
        value={stats?.totalVideos ?? 0}
        icon={Video}
      />
      <StatCard
        label="Documents & Audio"
        value={(stats?.totalDocuments ?? 0) + (stats?.totalAudio ?? 0)}
        icon={FileText}
      />
    </div>
  );
}

export default MediaStatsCards;
