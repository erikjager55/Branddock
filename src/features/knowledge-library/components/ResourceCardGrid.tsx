'use client';

import { Clock, ExternalLink } from 'lucide-react';
import type { ResourceWithMeta } from '../types/knowledge-library.types';
import { ResourceTypeIcon } from './shared/ResourceTypeIcon';
import { FavoriteButton } from './shared/FavoriteButton';
import { CardContextMenu } from './shared/CardContextMenu';
import { RESOURCE_TYPE_ICONS } from '../constants/library-constants';

interface ResourceCardGridProps {
  resources: ResourceWithMeta[];
  onFavorite: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ResourceCardGrid({
  resources,
  onFavorite,
  onArchive,
  onDelete,
}: ResourceCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4" data-testid="resource-grid">
      {resources.map((r) => (
        <div
          key={r.id}
          data-testid="resource-card"
          className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
        >
          {/* Thumbnail */}
          <div className="relative h-36 bg-green-50 flex items-center justify-center">
            <ResourceTypeIcon type={r.type} size={36} />
            <div className="absolute top-2 left-2">
              <FavoriteButton
                isFavorite={r.isFavorite}
                onToggle={() => onFavorite(r.id)}
              />
            </div>
            <div className="absolute top-2 right-2">
              <CardContextMenu
                onDownload={r.url ? () => window.open(r.url!, '_blank') : undefined}
                onArchive={onArchive ? () => onArchive(r.id) : undefined}
                onDelete={onDelete ? () => onDelete(r.id) : undefined}
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
              {r.title}
            </h4>
            <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">
              {r.description}
            </p>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                {r.category}
              </span>
              {r.estimatedDuration && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {r.estimatedDuration}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>

            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                Open Resource
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-gray-400 border border-gray-100 rounded-lg cursor-default">
                No URL
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
