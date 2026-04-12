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
    <div className="grid grid-cols-2 gap-6" style={{ minHeight: 0 }}>
      <div className="overflow-y-auto space-y-6 pr-2">
        {children}
      </div>
      <div>
        <div className="sticky top-0">
          <MediumPreviewPanel onAdvance={onAdvance} deliverableId={deliverableId} />
        </div>
      </div>
    </div>
  );
}
