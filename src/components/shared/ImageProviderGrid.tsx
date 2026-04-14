'use client';

import { Check } from 'lucide-react';
import type { FalProvider } from '@/lib/integrations/fal/fal-providers';

export interface ImageProviderGridProps {
  /** Providers to render as cards */
  providers: FalProvider[];
  /** Currently selected provider id */
  selectedId: string;
  /** Called when the user picks a provider */
  onSelect: (id: string) => void;
}

/**
 * Visual card grid for picking an AI image provider.
 * Shared between AI Trainer (reference generation) and AI Studio (ad-hoc generation).
 */
export function ImageProviderGrid({ providers, selectedId, onSelect }: ImageProviderGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => {
        const isSelected = selectedId === provider.id;
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            className={`group overflow-hidden rounded-xl border-2 text-left transition-all ${
              isSelected
                ? 'border-teal-500 ring-2 ring-teal-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Preview image */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
              <img
                src={`/images/fal-providers/${provider.preview}`}
                alt={provider.label}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {isSelected && (
                <div className="absolute right-2 top-2 rounded-full bg-teal-500 p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{provider.label}</span>
                <span className="text-[10px] font-medium text-gray-400">{provider.cost}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{provider.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
