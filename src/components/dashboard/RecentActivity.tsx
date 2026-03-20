import React from 'react';
import { Package, Users, Megaphone, Swords, Clock, AlertTriangle, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useRecentActivity, dashboardKeys } from '../../hooks/use-dashboard';
import { Skeleton } from '../shared';
import type { ActivityItem } from '../../types/dashboard';

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'brand-asset': { icon: Package, color: 'text-emerald-500' },
  persona: { icon: Users, color: 'text-blue-500' },
  campaign: { icon: Megaphone, color: 'text-orange-500' },
  competitor: { icon: Swords, color: 'text-red-500' },
};

const FALLBACK_CONFIG = { icon: Circle, color: 'text-gray-400' };

export function RecentActivity() {
  const { data, isLoading, isError } = useRecentActivity();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <Skeleton className="h-5 w-36 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-5">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load activity</span>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: dashboardKeys.activity })}
          className="text-sm text-red-600 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <div className="space-y-1">
        {data.map((item) => {
          const config = TYPE_CONFIG[item.type] ?? FALLBACK_CONFIG;
          const Icon = config.icon;
          return (
            <div key={item.id} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">{item.title}</div>
                <div className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
