'use client';

import React from 'react';
import { MediumPreviewPanel } from './MediumPreviewPanel';

interface MediumConfigLayoutProps {
  children: React.ReactNode;
  onAdvance: () => void;
  deliverableId?: string;
}

/** Two-column layout: scrollable config (left) + sticky preview panel (right) */
export function MediumConfigLayout({ children, onAdvance, deliverableId }: MediumConfigLayoutProps) {
  return (
    <div className="flex gap-6" style={{ minHeight: 0 }}>
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {children}
      </div>
      <div className="w-[400px] flex-shrink-0">
        <div className="sticky top-0">
          <MediumPreviewPanel onAdvance={onAdvance} deliverableId={deliverableId} />
        </div>
      </div>
    </div>
  );
}
