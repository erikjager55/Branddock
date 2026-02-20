"use client";

import React from "react";
import type { ContentTab } from "@/types/studio";
import { TextSettingsPanel } from "./TextSettingsPanel";
import { ImageSettingsPanel } from "./ImageSettingsPanel";
import { VideoSettingsPanel } from "./VideoSettingsPanel";
import { CarouselSettingsPanel } from "./CarouselSettingsPanel";

interface TypeSettingsPanelProps {
  activeTab: ContentTab;
}

export function TypeSettingsPanel({ activeTab }: TypeSettingsPanelProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Settings
      </label>
      {activeTab === "text" && <TextSettingsPanel />}
      {activeTab === "images" && <ImageSettingsPanel />}
      {activeTab === "video" && <VideoSettingsPanel />}
      {activeTab === "carousel" && <CarouselSettingsPanel />}
    </div>
  );
}
