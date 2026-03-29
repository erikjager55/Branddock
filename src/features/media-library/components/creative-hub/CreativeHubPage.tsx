'use client';

import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';
import { BrandModelsTab } from './brand-models/BrandModelsTab';
import { PhotographyStyleTab } from './photography-style/PhotographyStyleTab';
import { AnimationStyleTab } from './animation-style/AnimationStyleTab';
import { BrandVoiceTab } from './brand-voice/BrandVoiceTab';

// ─── Sub-tab configuration ──────────────────────────────────

const CREATIVE_HUB_TABS = [
  { key: 'brand-models', label: 'Brand Models' },
  { key: 'photography', label: 'Photography Styles' },
  { key: 'animation', label: 'Animation Styles' },
  { key: 'brand-voice', label: 'Brand Voice' },
] as const;

// ─── Component ──────────────────────────────────────────────

/** Orchestrator component for the Creative Hub sub-tabs within the Media Library. */
export function CreativeHubPage() {
  const creativeHubTab = useMediaLibraryStore((s) => s.creativeHubTab);
  const setCreativeHubTab = useMediaLibraryStore((s) => s.setCreativeHubTab);

  return (
    <div data-testid="creative-hub-page">
      {/* Sub-tab pill bar */}
      <div className="pb-4">
        <div className="flex gap-2">
          {CREATIVE_HUB_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCreativeHubTab(tab.key)}
              className={`
                rounded-full px-4 py-1.5 text-sm font-medium transition-colors
                ${creativeHubTab === tab.key
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              style={creativeHubTab === tab.key ? { backgroundColor: '#0D9488' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active sub-tab content */}
      <div>
        {creativeHubTab === 'brand-models' ? (
          <BrandModelsTab />
        ) : creativeHubTab === 'photography' ? (
          <PhotographyStyleTab />
        ) : creativeHubTab === 'animation' ? (
          <AnimationStyleTab />
        ) : creativeHubTab === 'brand-voice' ? (
          <BrandVoiceTab />
        ) : null}
      </div>
    </div>
  );
}
