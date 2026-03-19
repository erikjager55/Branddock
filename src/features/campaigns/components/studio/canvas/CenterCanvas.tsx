"use client";

import React from "react";
import type { ContentTab } from "@/types/studio";
import { TipTapEditor } from "./TipTapEditor";
import { ImageCanvas } from "./ImageCanvas";
import { VideoPlayer } from "./VideoPlayer";
import { CarouselEditor } from "./CarouselEditor";

interface CenterCanvasProps {
  activeTab: ContentTab;
  isPreviewMode: boolean;
}

export function CenterCanvas({ activeTab, isPreviewMode }: CenterCanvasProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-100">
      <div className="h-full p-6">
        {activeTab === "text" && <TipTapEditor isPreviewMode={isPreviewMode} />}
        {activeTab === "images" && <ImageCanvas isPreviewMode={isPreviewMode} />}
        {activeTab === "video" && <VideoPlayer />}
        {activeTab === "carousel" && <CarouselEditor isPreviewMode={isPreviewMode} />}
      </div>
    </div>
  );
}
