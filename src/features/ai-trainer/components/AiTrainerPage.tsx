'use client';

import { useState } from 'react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { Cpu, User, Camera, Clapperboard, Mic, Music } from 'lucide-react';
import { ConsistentModelsContent } from '@/features/consistent-models/components/ConsistentModelsPage';
import { BrandModelsTab } from '@/features/media-library/components/creative-hub/brand-models/BrandModelsTab';
import { PhotographyStyleTab } from '@/features/media-library/components/creative-hub/photography-style/PhotographyStyleTab';
import { AnimationStyleTab } from '@/features/media-library/components/creative-hub/animation-style/AnimationStyleTab';
import { BrandVoiceTab } from '@/features/media-library/components/creative-hub/brand-voice/BrandVoiceTab';
import { SoundEffectsTab } from '@/features/media-library/components/creative-hub/sound-effects/SoundEffectsTab';
import type { LucideIcon } from 'lucide-react';

const TABS = [
  { key: 'models', label: 'AI Models', icon: Cpu },
  { key: 'brand-models', label: 'Brand Models', icon: User },
  { key: 'photography', label: 'Photography', icon: Camera },
  { key: 'animation', label: 'Animation', icon: Clapperboard },
  { key: 'voices', label: 'Voices', icon: Mic },
  { key: 'sound', label: 'Sound Effects', icon: Music },
] as const;

type TrainerTab = (typeof TABS)[number]['key'];

interface AiTrainerPageProps {
  onNavigateToModelDetail: (id: string) => void;
}

/** AI Trainer page — train models and define brand styles */
export function AiTrainerPage({ onNavigateToModelDetail }: AiTrainerPageProps) {
  const [activeTab, setActiveTab] = useState<TrainerTab>('models');

  return (
    <PageShell>
      <PageHeader
        moduleKey="ai-trainer"
        title="AI Trainer"
        subtitle="Train models and define brand styles"
      />

      <div className="px-8 pt-4 pb-2">
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const TabIcon: LucideIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors
                  ${activeTab === tab.key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={activeTab === tab.key ? { backgroundColor: '#0D9488' } : undefined}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6 px-8 pb-8">
        {activeTab === 'models' && <ConsistentModelsContent onNavigateToDetail={onNavigateToModelDetail} />}
        {activeTab === 'brand-models' && <BrandModelsTab />}
        {activeTab === 'photography' && <PhotographyStyleTab />}
        {activeTab === 'animation' && <AnimationStyleTab />}
        {activeTab === 'voices' && <BrandVoiceTab />}
        {activeTab === 'sound' && <SoundEffectsTab />}
      </div>
    </PageShell>
  );
}
