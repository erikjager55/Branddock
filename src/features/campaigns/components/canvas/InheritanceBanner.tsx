'use client';

import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Sparkles, X } from 'lucide-react';

// Shown at the top of the Canvas when the current deliverable had its
// settings auto-inherited from a prior completed deliverable of the same
// type in the same campaign. Click "Change settings" to jump back to the
// Context step so the user can override; X dismisses without reverting.
export function InheritanceBanner() {
  const inheritedFrom = useCanvasStore((s) => s.inheritedFrom);
  const setInheritedFrom = useCanvasStore((s) => s.setInheritedFrom);
  const goToStep = useCanvasStore((s) => s.goToStep);

  if (!inheritedFrom) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-primary-50 border-b border-primary-100 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-gray-700 truncate">
          Settings inherited from{' '}
          <span className="font-medium text-gray-900">{inheritedFrom.title}</span>
          <span className="mx-2 text-gray-400">·</span>
          Context, Medium, and type-specific inputs were copied.
        </span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => goToStep('context')}
          className="text-primary hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-100"
        >
          Change settings
        </button>
        <button
          type="button"
          onClick={() => setInheritedFrom(null)}
          className="p-1 rounded hover:bg-primary-100 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
