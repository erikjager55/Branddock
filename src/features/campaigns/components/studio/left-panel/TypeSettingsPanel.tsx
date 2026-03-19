"use client";

import React from "react";
import type { ContentTab } from "@/types/studio";
import { DynamicSettingsPanel } from "./DynamicSettingsPanel";
import { ImageSettingsPanel } from "./ImageSettingsPanel";
import { VideoSettingsPanel } from "./VideoSettingsPanel";
import { CarouselSettingsPanel } from "./CarouselSettingsPanel";

interface TypeSettingsPanelProps {
  activeTab: ContentTab;
  contentType: string;
}

export function TypeSettingsPanel({ activeTab, contentType }: TypeSettingsPanelProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Settings
      </label>
      {activeTab === "text" && <DynamicSettingsPanel contentType={contentType} />}
      {activeTab === "images" && <ImageSettingsPanel />}
      {activeTab === "video" && <VideoSettingsPanel />}
      {activeTab === "carousel" && <CarouselSettingsPanel />}
    </div>
  );
}
