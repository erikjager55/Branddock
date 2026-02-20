'use client';

import { Image } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import type { WorkshopPhoto } from '../../types/workshop.types';

interface GalleryTabProps {
  photos: WorkshopPhoto[];
}

export function GalleryTab({ photos }: GalleryTabProps) {
  const safePhotos = Array.isArray(photos) ? photos : [];
  if (safePhotos.length === 0) {
    return (
      <EmptyState
        icon={Image}
        title="No photos yet"
        description="Photos from the workshop session will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {safePhotos.map((photo) => (
        <div
          key={photo.id}
          className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
        >
          <div className="aspect-video bg-gray-200 flex items-center justify-center">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
          {photo.caption && (
            <p className="p-3 text-xs text-gray-600">{photo.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
