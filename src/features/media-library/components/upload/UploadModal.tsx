'use client';

import React from 'react';
import { UploadCloud, Link as LinkIcon, Images } from 'lucide-react';
import { Modal } from '@/components/shared';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';
import FileDropzone from './FileDropzone';
import UrlImportTab from './UrlImportTab';
import StockPhotoTab from './StockPhotoTab';

// ─── Tab Config ─────────────────────────────────────────────

type UploadTab = 'upload' | 'import-url' | 'stock';

const TABS: { id: UploadTab; label: string; icon: typeof UploadCloud }[] = [
  { id: 'upload', label: 'Upload', icon: UploadCloud },
  { id: 'import-url', label: 'Import URL', icon: LinkIcon },
  { id: 'stock', label: 'Stock Photos', icon: Images },
];

// ─── Component ──────────────────────────────────────────────

/** Modal with 3 tabs for adding media to the library. */
export function UploadModal() {
  const isUploadModalOpen = useMediaLibraryStore((s) => s.isUploadModalOpen);
  const setUploadModalOpen = useMediaLibraryStore((s) => s.setUploadModalOpen);
  const activeUploadTab = useMediaLibraryStore((s) => s.activeUploadTab);
  const setActiveUploadTab = useMediaLibraryStore((s) => s.setActiveUploadTab);

  return (
    <Modal
      isOpen={isUploadModalOpen}
      onClose={() => setUploadModalOpen(false)}
      title="Add Media"
      size="lg"
    >
      {/* Underlined tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 -mx-1 mb-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeUploadTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveUploadTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-teal-700'
                  : 'text-gray-500 hover:text-gray-800'
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

      {/* Tab Content */}
      <div>
        {activeUploadTab === 'upload' && <FileDropzone />}
        {activeUploadTab === 'import-url' && <UrlImportTab />}
        {activeUploadTab === 'stock' && <StockPhotoTab />}
      </div>
    </Modal>
  );
}

export default UploadModal;
