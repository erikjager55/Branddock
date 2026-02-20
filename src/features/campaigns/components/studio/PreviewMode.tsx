'use client';

import React from 'react';
import { X, FileText, Image, Film } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────

interface PreviewModeProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null;
  imageUrls: string[];
  videoUrl: string | null;
  contentTab: string | null;
}

// ─── Component ─────────────────────────────────────────

export function PreviewMode({
  isOpen,
  onClose,
  content,
  imageUrls,
  videoUrl,
  contentTab,
}: PreviewModeProps) {
  const safeImageUrls = Array.isArray(imageUrls) ? imageUrls : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close preview"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Content area */}
      <div className="max-w-4xl w-full max-h-[90vh] overflow-auto mx-4">
        {contentTab === 'text' || contentTab === null ? (
          // Text preview
          <div className="bg-white rounded-lg p-8">
            {content ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <FileText className="w-12 h-12" />
                <p className="text-sm">No text content to preview.</p>
              </div>
            )}
          </div>
        ) : contentTab === 'images' ? (
          // Image grid preview
          safeImageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {safeImageUrls.map((url, index) => (
                <div key={index} className="rounded-lg overflow-hidden bg-white">
                  <img
                    src={url}
                    alt={`Preview image ${index + 1}`}
                    className="w-full h-auto object-contain"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Image className="w-12 h-12" />
              <p className="text-sm text-white/60">No images to preview.</p>
            </div>
          )
        ) : contentTab === 'video' ? (
          // Video player placeholder
          videoUrl ? (
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={videoUrl}
                controls
                className="w-full h-auto"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Film className="w-12 h-12" />
              <p className="text-sm text-white/60">No video to preview.</p>
            </div>
          )
        ) : (
          // Carousel / fallback
          <div className="bg-white rounded-lg p-8">
            {content ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">
                No content to preview.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PreviewMode;
