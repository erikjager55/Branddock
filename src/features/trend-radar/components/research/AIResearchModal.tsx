'use client';

import { useState } from 'react';
import { Sparkles, Brain } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { useStartResearch } from '../../hooks';

export function AIResearchModal() {
  const {
    isResearchModalOpen,
    closeResearchModal,
    setResearchJobId,
    openResearchProgressModal,
  } = useTrendRadarStore();

  const [query, setQuery] = useState('');
  const [useBrandContext, setUseBrandContext] = useState(false);
  const startMutation = useStartResearch();

  const handleStart = async () => {
    if (query.trim().length < 3) return;
    try {
      const job = await startMutation.mutateAsync({
        query: query.trim(),
        useBrandContext,
      });
      setResearchJobId(job.id);
      closeResearchModal();
      setQuery('');
      setUseBrandContext(false);
      openResearchProgressModal();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    closeResearchModal();
    setQuery('');
    setUseBrandContext(false);
  };

  return (
    <Modal
      isOpen={isResearchModalOpen}
      onClose={handleClose}
      title="AI Research"
      size="md"
    >
      <div className="space-y-5 py-2">
        {/* Description */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-800">
            Describe what you want to research. AI will find relevant sources, scrape them,
            and detect trends from the content.
          </p>
        </div>

        {/* Query input */}
        <div>
          <label htmlFor="research-query" className="block text-sm font-medium text-gray-700 mb-1.5">
            Research topic
          </label>
          <textarea
            id="research-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. AI trends in brand strategy, sustainability in fashion retail..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum 3 characters</p>
        </div>

        {/* Brand context toggle */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            checked={useBrandContext}
            onChange={(e) => setUseBrandContext(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700">Use brand context</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Include your brand assets, personas, and products for more relevant results
            </p>
          </div>
        </label>

        {/* Error */}
        {startMutation.isError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-sm text-red-700">
              {startMutation.error instanceof Error ? startMutation.error.message : 'Failed to start research'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            onClick={handleStart}
            isLoading={startMutation.isPending}
            disabled={query.trim().length < 3}
          >
            Start Research
          </Button>
        </div>
      </div>
    </Modal>
  );
}
