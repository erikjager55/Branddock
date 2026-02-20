'use client';

import { Clock, Star } from 'lucide-react';
import type { ResourceWithMeta } from '../types/knowledge-library.types';
import { ResourceTypeIcon } from './shared/ResourceTypeIcon';
import { RESOURCE_TYPE_ICONS } from '../constants/library-constants';

interface FeaturedResourcesCarouselProps {
  resources: ResourceWithMeta[];
}

export function FeaturedResourcesCarousel({ resources }: FeaturedResourcesCarouselProps) {
  if (resources.length === 0) return null;

  return (
    <div className="mb-6" data-testid="featured-carousel">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Featured Resources</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {resources.map((r) => (
          <div
            key={r.id}
            data-testid="featured-resource-card"
            className="min-w-[320px] snap-start bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
          >
            {/* Thumbnail */}
            <div className="h-40 bg-green-50 flex items-center justify-center">
              <ResourceTypeIcon type={r.type} size={40} />
            </div>

            {/* Body */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                {r.title}
              </h4>
              <p className="text-xs text-gray-500 mb-2">{r.author}</p>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                {r.estimatedDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {r.estimatedDuration}
                  </span>
                )}
                {r.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    {r.rating.toFixed(1)}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {RESOURCE_TYPE_ICONS[r.type]?.label ?? r.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
