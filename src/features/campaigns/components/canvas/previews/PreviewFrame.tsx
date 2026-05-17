'use client';

import React from 'react';

interface PreviewFrameProps {
  platformLabel: string;
  platformColor: string;
  children: React.ReactNode;
  /**
   * Real-world width cap in pixels. Carousels using PreviewFrame on
   * LinkedIn (~555px feed column) or Instagram (~470px feed) should pass
   * this so the preview matches actual platform proportions rather than
   * stretching to container width. Omit to render at full container width
   * (default for non-platform-specific previews).
   */
  maxWidthPx?: number;
}

/** Shared wrapper for all platform preview mockups */
export function PreviewFrame({
  platformLabel,
  platformColor,
  children,
  maxWidthPx,
}: PreviewFrameProps) {
  const wrapperStyle = maxWidthPx ? { maxWidth: `${maxWidthPx}px` } : undefined;
  const wrapperClass = maxWidthPx
    ? 'rounded-lg border border-gray-200 bg-white overflow-hidden mx-auto w-full'
    : 'rounded-lg border border-gray-200 bg-white overflow-hidden';
  return (
    <div className={wrapperClass} style={wrapperStyle}>
      {/* Platform header bar */}
      <div
        className="px-3 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: platformColor }}
      >
        {platformLabel}
      </div>
      {/* Preview content */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}
