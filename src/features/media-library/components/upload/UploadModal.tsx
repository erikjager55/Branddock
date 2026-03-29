'use client';

import React from 'react';
import { Modal } from '@/components/shared';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';

// Sub-components (placeholders — will be implemented separately)
import FileDropzone from './FileDropzone';
import UrlImportTab from './UrlImportTab';
import StockPhotoTab from './StockPhotoTab';

// ─── Tab Config ─────────────────────────────────────────────

type UploadTab = 'upload' | 'import-url' | 'stock' | 'ai';

const TABS: { id: UploadTab; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'import-url', label: 'Import URL' },
  { id: 'stock', label: 'Stock Photos' },
  { id: 'ai', label: 'AI Generate' },
];

// ─── Component ──────────────────────────────────────────────

/** Modal with 4 tabs for uploading / importing media assets */
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
      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveUploadTab(tab.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeUploadTab === tab.id
                ? 'bg-white shadow-sm font-medium text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeUploadTab === 'upload' && <FileDropzone />}
        {activeUploadTab === 'import-url' && <UrlImportTab />}
        {activeUploadTab === 'stock' && <StockPhotoTab />}
        {activeUploadTab === 'ai' && (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">
            AI media generation coming soon
          </div>
        )}
      </div>
    </Modal>
  );
}

export default UploadModal;
