"use client";

import React from "react";
import type { ContentTab } from "@/types/studio";
import type { KnowledgeAssetResponse } from "@/types/campaign";
import { PromptSection } from "./PromptSection";
import { BriefContextPanel } from "./BriefContextPanel";
import { AiModelSelector } from "./AiModelSelector";
import { TypeSettingsPanel } from "./TypeSettingsPanel";
import { KnowledgeContextPanel } from "./KnowledgeContextPanel";
import { PersonaContextPanel } from "./PersonaContextPanel";
import { GenerateButton } from "./GenerateButton";
import { STUDIO } from "@/lib/constants/design-tokens";

interface LeftPanelProps {
  deliverableId: string;
  activeTab: ContentTab;
  contentType: string;
  knowledgeAssets: KnowledgeAssetResponse[];
  knowledgeConfidence: number | null;
}

export function LeftPanel({ deliverableId, activeTab, contentType, knowledgeAssets, knowledgeConfidence }: LeftPanelProps) {
  return (
    <div className={`${STUDIO.panel.left} flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col`}>
      <div className="flex-1 p-4 space-y-5">
        <PromptSection />
        <BriefContextPanel />
        <AiModelSelector activeTab={activeTab} />
        <TypeSettingsPanel activeTab={activeTab} contentType={contentType} />
        <KnowledgeContextPanel
          assets={knowledgeAssets}
          confidence={knowledgeConfidence}
        />
        <PersonaContextPanel />
      </div>
      <div className="p-4 border-t">
        <GenerateButton deliverableId={deliverableId} activeTab={activeTab} />
      </div>
    </div>
  );
}
