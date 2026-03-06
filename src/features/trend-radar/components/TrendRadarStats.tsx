'use client';

import { Radar, Zap, CalendarClock, Sparkles } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { useTrendStats } from '../hooks';

export function TrendRadarStats() {
  const { data, isLoading } = useTrendStats();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Trends" value={data.total} icon={Radar} />
      <StatCard label="Activated" value={data.activated} icon={Zap} />
      <StatCard label="New This Week" value={data.newThisWeek} icon={CalendarClock} />
      <StatCard label="AI Researched" value={data.aiResearched} icon={Sparkles} />
    </div>
  );
}
