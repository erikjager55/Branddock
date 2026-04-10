"use client";

import { useState } from "react";
import { Sparkles, ImageOff } from "lucide-react";

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
          <SampleTile key={`${url}-${i}`} url={url} index={i} />
        ))}
      </div>
    </div>
  );
}

function SampleTile({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      {failed ? (
        <div className="flex h-full w-full items-center justify-center text-gray-400">
          <ImageOff className="h-6 w-6" />
        </div>
      ) : (
        <img
          src={url}
          alt={`Training sample ${index + 1}`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
