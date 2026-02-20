import { Play } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { VideoTutorialItem } from '@/types/help';

interface VideoTutorialCardProps {
  video: VideoTutorialItem;
  onClick?: () => void;
}

// ─── Category badge color mapping ─────────────────────────
const CATEGORY_COLOR_MAP: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal'> = {
  blue: 'info',
  green: 'success',
  purple: 'default',
  orange: 'warning',
  red: 'danger',
  teal: 'teal',
};

export function VideoTutorialCard({ video, onClick }: VideoTutorialCardProps) {
  const badgeVariant =
    video.categoryColor && CATEGORY_COLOR_MAP[video.categoryColor]
      ? CATEGORY_COLOR_MAP[video.categoryColor]
      : 'default';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-shadow rounded-xl border border-gray-200 overflow-hidden"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Thumbnail */}
      <div className="relative bg-gray-200 rounded-t-lg aspect-video flex items-center justify-center">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : null}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-md">
            <Play className="w-5 h-5 text-gray-800 ml-0.5" />
          </div>
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {video.duration}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
        {video.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {video.description}
          </p>
        )}
        {video.categoryBadge && (
          <Badge variant={badgeVariant} size="sm">
            {video.categoryBadge}
          </Badge>
        )}
      </div>
    </div>
  );
}
