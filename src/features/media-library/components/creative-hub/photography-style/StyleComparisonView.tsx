'use client';

import React from 'react';
import { ArrowLeftRight, Camera } from 'lucide-react';
import type { StyleReferenceWithMeta } from '@/features/media-library/types/media.types';

interface StyleComparisonViewProps {
  styleA: StyleReferenceWithMeta | null;
  styleB: StyleReferenceWithMeta | null;
  allStyles: StyleReferenceWithMeta[];
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
}

/** Side-by-side comparison of two photography style references. */
export function StyleComparisonView({
  styleA,
  styleB,
  allStyles,
  onSelectA,
  onSelectB,
}: StyleComparisonViewProps) {
  if (allStyles.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <ArrowLeftRight className="w-8 h-8 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-gray-600 font-medium">
          Create at least two styles to compare them side by side.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Selector row */}
      <div className="grid grid-cols-2 border-b border-gray-200">
        <div className="p-3 border-r border-gray-200">
          <label htmlFor="compare-style-a" className="block text-xs font-medium text-gray-500 mb-1">
            Style A
          </label>
          <select
            id="compare-style-a"
            value={styleA?.id ?? ''}
            onChange={(e) => onSelectA(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select a style...
            </option>
            {allStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="p-3">
          <label htmlFor="compare-style-b" className="block text-xs font-medium text-gray-500 mb-1">
            Style B
          </label>
          <select
            id="compare-style-b"
            value={styleB?.id ?? ''}
            onChange={(e) => onSelectB(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>
              Select a style...
            </option>
            {allStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison content */}
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <ComparisonSide style={styleA} />
        <ComparisonSide style={styleB} />
      </div>
    </div>
  );
}

// ─── Internal sub-component ─────────────────────────────────

function ComparisonSide({ style }: { style: StyleReferenceWithMeta | null }) {
  if (!style) {
    return (
      <div className="p-6 flex items-center justify-center text-center min-h-[200px]">
        <p className="text-sm text-gray-400">Select a style to compare</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Images */}
      <div className="flex gap-2 overflow-x-auto">
        {style.referenceImages.length > 0 ? (
          style.referenceImages.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`${style.name} reference ${idx + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
            />
          ))
        ) : (
          <div className="w-20 h-20 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Camera className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Name */}
      <h4 className="text-sm font-semibold text-gray-900">{style.name}</h4>

      {/* Style prompt */}
      {style.stylePrompt && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Style Prompt</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{style.stylePrompt}</p>
        </div>
      )}

      {/* Negative prompt */}
      {style.negativePrompt && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Negative Prompt</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{style.negativePrompt}</p>
        </div>
      )}

      {/* Model name */}
      {style.modelName && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Model</p>
          <p className="text-xs text-gray-700">{style.modelName}</p>
        </div>
      )}

      {/* Notes */}
      {style.modelDescription && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-0.5">Notes</p>
          <p className="text-xs text-gray-700">{style.modelDescription}</p>
        </div>
      )}
    </div>
  );
}
