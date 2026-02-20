'use client';

import { X } from 'lucide-react';
import { useMarketInsightsStore } from '../../stores/useMarketInsightsStore';
import { AiResearchTab } from './AiResearchTab';
import { ManualEntryTab } from './ManualEntryTab';
import { ImportDatabaseTab } from './ImportDatabaseTab';

type AddTab = 'ai-research' | 'manual' | 'import';

const TABS: { id: AddTab; label: string }[] = [
  { id: 'ai-research', label: 'AI Research' },
  { id: 'manual', label: 'Manual Entry' },
  { id: 'import', label: 'Import from Database' },
];

export function AddInsightModal() {
  const activeAddTab = useMarketInsightsStore((s) => s.activeAddTab);
  const setActiveAddTab = useMarketInsightsStore((s) => s.setActiveAddTab);
  const setAddModalOpen = useMarketInsightsStore((s) => s.setAddModalOpen);

  return (
    <div data-testid="add-insight-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[640px] max-h-[85vh] rounded-xl bg-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-gray-900">Add Market Insight</h2>
          <button
            onClick={() => setAddModalOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {TABS.map((tab) => {
            const isActive = activeAddTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id === 'ai-research' ? 'ai-research' : tab.id === 'manual' ? 'manual-entry' : 'import-database'}`}
                onClick={() => setActiveAddTab(tab.id)}
                className={`px-4 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-green-500 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeAddTab === 'ai-research' && <AiResearchTab />}
          {activeAddTab === 'manual' && <ManualEntryTab />}
          {activeAddTab === 'import' && <ImportDatabaseTab />}
        </div>
      </div>
    </div>
  );
}
