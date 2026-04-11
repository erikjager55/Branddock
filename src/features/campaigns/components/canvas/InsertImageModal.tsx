'use client';

import React, { useState } from 'react';
import { Library, Link as LinkIcon, Images, Wand2 } from 'lucide-react';
import { Modal } from '@/components/shared';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { LibraryTab } from './insert-image/LibraryTab';
import { UrlImportTab } from './insert-image/UrlImportTab';
import { StockPhotosTab } from './insert-image/StockPhotosTab';
import { GenerateImageTab } from './insert-image/GenerateImageTab';
import type { InsertImageSelection } from './insert-image/types';

type InsertImageTab = 'library' | 'url' | 'stock' | 'generate';

const TABS: { id: InsertImageTab; label: string; icon: typeof Library }[] = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'url', label: 'Import URL', icon: LinkIcon },
  { id: 'stock', label: 'Stock Photos', icon: Images },
  { id: 'generate', label: 'Generate Image', icon: Wand2 },
];

/**
 * Modal opened from Step 3 (Medium) of the Content Canvas. Lets the user
 * pick an image from 4 sources to be the hero image of the deliverable:
 *
 *   1. Library      — existing MediaAsset (IMAGE type)
 *   2. Import URL   — paste a public image URL, server downloads + saves
 *   3. Stock Photos — Pexels search + import
 *   4. Generate     — AI Studio image generator (trained model or generic)
 *
 * Every tab fires onSelected when the user picks/imports an image. The
 * modal then writes the result to canvas store (heroImage) and closes.
 * Persistence to the DeliverableComponent is handled in Fase 4.
 */
export function InsertImageModal() {
  const isOpen = useCanvasStore((s) => s.insertImageModalOpen);
  const setOpen = useCanvasStore((s) => s.setInsertImageModalOpen);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);

  const [activeTab, setActiveTab] = useState<InsertImageTab>('library');

  const handleSelected = (selection: InsertImageSelection) => {
    setHeroImage({
      url: selection.url,
      mediaAssetId: selection.mediaAssetId,
      alt: selection.alt,
    });
    setOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title="Insert Image" size="lg">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 -mx-1 mb-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-teal-700' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'library' && <LibraryTab onSelected={handleSelected} />}
        {activeTab === 'url' && <UrlImportTab onSelected={handleSelected} />}
        {activeTab === 'stock' && <StockPhotosTab onSelected={handleSelected} />}
        {activeTab === 'generate' && <GenerateImageTab onSelected={handleSelected} />}
      </div>
    </Modal>
  );
}
