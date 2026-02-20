'use client';

import { Suspense, type ReactNode } from 'react';
import { Skeleton } from './Skeleton';

/** Full-page skeleton shown while a lazy-loaded module chunk is downloading. */
function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      {/* Content area */}
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

/**
 * Wraps children in a React Suspense boundary with a Skeleton fallback.
 * Use around lazy-loaded page components to prevent blank screens.
 */
export function LazyWrapper({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
