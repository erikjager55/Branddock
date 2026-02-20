'use client';

import { useVideoTutorials } from '@/hooks/use-help';
import { SkeletonCard } from '@/components/shared';
import { VideoTutorialCard } from './VideoTutorialCard';

export function VideoTutorials() {
  const { data: videos, isLoading } = useVideoTutorials();

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Video Tutorials</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} height={240} />
          ))}
        </div>
      ) : videos && videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoTutorialCard
              key={video.id}
              video={video}
              onClick={() => console.log('Play video:', video.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">
          No video tutorials available yet.
        </p>
      )}
    </section>
  );
}
