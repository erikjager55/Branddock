'use client';

import React from 'react';

interface PreviewFrameProps {
  platformLabel: string;
  platformColor: string;
  children: React.ReactNode;
}

/** Shared wrapper for all platform preview mockups */
export function PreviewFrame({ platformLabel, platformColor, children }: PreviewFrameProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
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
