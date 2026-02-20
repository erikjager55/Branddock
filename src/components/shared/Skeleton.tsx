'use client';

import React from 'react';
import { cn } from '@/lib/constants/design-tokens';

// ─── Base ─────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/** Base skeleton block — animated pulse rectangle */
export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn('bg-gray-200 animate-pulse rounded', className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// ─── Variants ─────────────────────────────────────────────

interface SkeletonCardProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/** Card-shaped skeleton placeholder */
export function SkeletonCard({ className, width, height }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-5 space-y-4',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Skeleton className="rounded-lg" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton className="rounded" width="60%" height={14} />
          <Skeleton className="rounded" width="40%" height={10} />
        </div>
      </div>
      {/* Body lines */}
      <div className="space-y-2">
        <Skeleton className="rounded" height={10} width="100%" />
        <Skeleton className="rounded" height={10} width="90%" />
        <Skeleton className="rounded" height={10} width="70%" />
      </div>
      {/* Footer */}
      <div className="flex items-center gap-2">
        <SkeletonBadge />
        <SkeletonBadge width={48} />
      </div>
    </div>
  );
}

interface SkeletonTextProps {
  className?: string;
  /** Number of text lines — defaults to 3 */
  lines?: number;
  width?: string | number;
}

/** Multi-line text placeholder */
export function SkeletonText({ className, lines = 3, width }: SkeletonTextProps) {
  return (
    <div
      className={cn('space-y-2', className)}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="rounded"
          height={12}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/** Circle avatar placeholder */
export function SkeletonAvatar({ className, width = 40, height = 40 }: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn('rounded-full', className)}
      width={width}
      height={height}
    />
  );
}

interface SkeletonBadgeProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

/** Pill-shaped badge placeholder */
export function SkeletonBadge({ className, width = 64, height = 20 }: SkeletonBadgeProps) {
  return (
    <Skeleton
      className={cn('rounded-full', className)}
      width={width}
      height={height}
    />
  );
}

export default Skeleton;
