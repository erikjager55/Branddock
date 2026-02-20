'use client';

import React from 'react';
import { useSystemStatus } from '@/hooks/use-help';
import { Skeleton } from '@/components/shared';

const statusConfig = {
  operational: { dot: 'bg-emerald-500', label: 'All Systems Operational', text: 'text-emerald-700' },
  degraded: { dot: 'bg-amber-500', label: 'Degraded Performance', text: 'text-amber-700' },
  outage: { dot: 'bg-red-500', label: 'System Outage', text: 'text-red-700' },
};

const serviceStatusConfig = {
  operational: { dot: 'bg-emerald-500', label: 'Operational' },
  degraded: { dot: 'bg-amber-500', label: 'Degraded' },
  outage: { dot: 'bg-red-500', label: 'Outage' },
};

export function SystemStatus() {
  const { data: status, isLoading } = useSystemStatus();

  if (isLoading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <Skeleton className="rounded-lg" width="100%" height={48} />
          <Skeleton className="rounded" width="100%" height={32} />
          <Skeleton className="rounded" width="100%" height={32} />
          <Skeleton className="rounded" width="100%" height={32} />
        </div>
      </section>
    );
  }

  if (!status) return null;

  const overallConfig = statusConfig[status.overall];

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>

      {/* Overall status */}
      <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 mb-4">
        <span className={`w-3 h-3 rounded-full ${overallConfig.dot}`} />
        <span className={`text-sm font-medium ${overallConfig.text}`}>
          {overallConfig.label}
        </span>
      </div>

      {/* Service rows */}
      <div className="space-y-2">
        {status.services.map((service) => {
          const svcConfig = serviceStatusConfig[service.status];
          return (
            <div
              key={service.name}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${svcConfig.dot}`} />
                <span className="text-sm text-gray-900">{service.name}</span>
              </div>
              <span className="text-xs text-gray-500">{svcConfig.label}</span>
            </div>
          );
        })}
      </div>

      {/* Updated timestamp */}
      <p className="text-xs text-gray-400 mt-3">
        Updated {new Date(status.updatedAt).toLocaleString()}
      </p>
    </section>
  );
}
