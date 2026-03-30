'use client';

import { useState } from 'react';
import { PageShell, PageHeader } from '@/components/ui/layout';
import { ImagePlus, Video } from 'lucide-react';
import { AiImagesTab } from '@/features/media-library/components/creative-hub/ai-images/AiImagesTab';
import { AiVideosTab } from '@/features/media-library/components/creative-hub/ai-videos/AiVideosTab';
import type { LucideIcon } from 'lucide-react';

const TABS = [
  { key: 'images', label: 'Images', icon: ImagePlus },
  { key: 'videos', label: 'Videos', icon: Video },
] as const;

type StudioTab = (typeof TABS)[number]['key'];

/** AI Studio page — generate images and videos with AI */
export function AiStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('images');

  return (
    <PageShell>
      <PageHeader
        moduleKey="ai-studio"
        title="AI Studio"
        subtitle="Generate images and videos with AI"
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
        {activeTab === 'images' && <AiImagesTab />}
        {activeTab === 'videos' && <AiVideosTab />}
      </div>
    </PageShell>
  );
}
