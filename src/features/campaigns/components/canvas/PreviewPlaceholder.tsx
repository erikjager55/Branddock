'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { EmptyState } from '@/components/shared';

export function PreviewPlaceholder() {
  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex items-center justify-center p-6">
      <EmptyState
        icon={Eye}
        title="Preview"
        description="Platform preview will appear here in a future update."
      />
    </div>
  );
}
