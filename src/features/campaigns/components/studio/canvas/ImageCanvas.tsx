"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";

interface ImageCanvasProps {
  isPreviewMode: boolean;
}

export function ImageCanvas({ isPreviewMode }: ImageCanvasProps) {
  const rawImageUrls = useContentStudioStore((s) => s.imageUrls);
  const imageUrls = Array.isArray(rawImageUrls) ? rawImageUrls : [];
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (imageUrls.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No images yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Write a prompt and click Generate to create images
          </p>
        </div>
      </div>
    );
  }

  const currentImage = imageUrls[selectedIndex];

  return (
    <div className="h-full flex flex-col">
      {/* Zoom Controls */}
      {!isPreviewMode && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-gray-500 w-12 text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div
          className="rounded-lg overflow-hidden shadow-lg bg-white"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center" }}
        >
          <img
            src={currentImage}
            alt={`Generated image ${selectedIndex + 1}`}
            className="max-w-full h-auto"
          />
        </div>
      </div>

      {/* Thumbnails */}
      {imageUrls.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`h-14 w-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === selectedIndex ? "border-teal-500" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
