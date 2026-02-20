'use client';

import { User } from 'lucide-react';
import { OptimizedImage } from '@/components/shared';

interface AvatarUploadProps {
  avatarUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

export function AvatarUpload({ avatarUrl, onUpload, onRemove }: AvatarUploadProps) {
  function handleUpload() {
    // Stub: prompt for a demo URL
    const url = window.prompt('Enter avatar URL (demo stub):', 'https://via.placeholder.com/128');
    if (url) {
      onUpload(url);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <OptimizedImage
        src={avatarUrl}
        alt="Avatar"
        avatar="lg"
        fallback={
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        }
      />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleUpload}
          className="text-sm text-primary hover:text-primary/80 font-medium text-left"
        >
          Upload
        </button>
        {avatarUrl && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-gray-500 hover:text-red-600 font-medium text-left"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
