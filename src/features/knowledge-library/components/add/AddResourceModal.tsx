'use client';

import { Pencil, Sparkles, Upload } from 'lucide-react';
import { Modal } from '@/components/shared';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { ManualEntryTab } from './ManualEntryTab';
import { SmartImportTab } from './SmartImportTab';
import { FileUploadTab } from './FileUploadTab';

const TABS = [
  { id: 'manual' as const, label: 'Manual Entry', icon: Pencil },
  { id: 'import' as const, label: 'Smart Import', icon: Sparkles },
  { id: 'upload' as const, label: 'File Upload', icon: Upload },
];

export function AddResourceModal() {
  const store = useKnowledgeLibraryStore();

  const handleClose = () => store.setAddModalOpen(false);

  return (
    <Modal
      isOpen={store.isAddModalOpen}
      onClose={handleClose}
      title="Add Resource"
      size="lg"
    >
      <div data-testid="add-resource-modal">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = store.activeAddTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => store.setActiveAddTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="max-h-[60vh] overflow-y-auto">
        {store.activeAddTab === 'manual' && (
          <div data-testid="manual-resource-tab">
            <ManualEntryTab onClose={handleClose} />
          </div>
        )}
        {store.activeAddTab === 'import' && (
          <div data-testid="smart-import-tab">
            <SmartImportTab
              onSwitchToManual={() => store.setActiveAddTab('manual')}
            />
          </div>
        )}
        {store.activeAddTab === 'upload' && (
          <div data-testid="file-upload-tab">
            <FileUploadTab onClose={handleClose} />
          </div>
        )}
      </div>
      </div>
    </Modal>
  );
}
