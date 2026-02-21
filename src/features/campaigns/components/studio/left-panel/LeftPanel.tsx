"use client";

import React from "react";
import type { ContentTab } from "@/types/studio";
import type { KnowledgeAssetResponse } from "@/types/campaign";
import { PromptSection } from "./PromptSection";
import { AiModelSelector } from "./AiModelSelector";
import { TypeSettingsPanel } from "./TypeSettingsPanel";
import { KnowledgeContextPanel } from "./KnowledgeContextPanel";
import { PersonaContextPanel } from "./PersonaContextPanel";
import { GenerateButton } from "./GenerateButton";

interface LeftPanelProps {
  deliverableId: string;
  activeTab: ContentTab;
  knowledgeAssets: KnowledgeAssetResponse[];
  knowledgeConfidence: number | null;
}

export function LeftPanel({ deliverableId, activeTab, knowledgeAssets, knowledgeConfidence }: LeftPanelProps) {
  return (
    <div className="w-80 border-r bg-white overflow-y-auto flex flex-col">
      <div className="flex-1 p-4 space-y-5">
        <PromptSection />
        <AiModelSelector activeTab={activeTab} />
        <TypeSettingsPanel activeTab={activeTab} />
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
