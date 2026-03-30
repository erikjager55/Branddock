"use client";

import { Sparkles } from "lucide-react";

interface SampleGalleryProps {
  urls: string[];
}

/** Gallery of AI-generated sample images from training */
export function SampleGallery({ urls }: SampleGalleryProps) {
  if (urls.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Sparkles className="h-3.5 w-3.5" />
        Training samples
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <div
            key={i}
            className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
          >
            <img
              src={url}
              alt={`Training sample ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
