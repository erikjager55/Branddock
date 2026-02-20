'use client';

import { Clock, ExternalLink } from 'lucide-react';
import type { ResourceWithMeta } from '../types/knowledge-library.types';
import { ResourceTypeIcon } from './shared/ResourceTypeIcon';
import { FavoriteButton } from './shared/FavoriteButton';
import { CardContextMenu } from './shared/CardContextMenu';

interface ResourceCardListProps {
  resources: ResourceWithMeta[];
  onFavorite: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ResourceCardList({
  resources,
  onFavorite,
  onArchive,
  onDelete,
}: ResourceCardListProps) {
  return (
    <div className="space-y-2" data-testid="resource-list">
      {resources.map((r) => (
        <div
          key={r.id}
          data-testid="resource-list-item"
          className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors p-4"
        >
          {/* Thumbnail */}
          <div className="w-24 h-24 flex-shrink-0 bg-green-50 rounded-lg flex items-center justify-center">
            <ResourceTypeIcon type={r.type} size={28} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
              {r.title}
            </h4>
            <p className="text-xs text-gray-500 line-clamp-1 mb-2">
              {r.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {r.category}
              </span>
              {r.estimatedDuration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {r.estimatedDuration}
                </span>
              )}
              <span>{r.author}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
              >
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-sm text-gray-400">No URL</span>
            )}
            <FavoriteButton
              isFavorite={r.isFavorite}
              onToggle={() => onFavorite(r.id)}
            />
            <CardContextMenu
              onDownload={r.url ? () => window.open(r.url!, '_blank') : undefined}
              onArchive={onArchive ? () => onArchive(r.id) : undefined}
              onDelete={onDelete ? () => onDelete(r.id) : undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
