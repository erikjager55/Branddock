'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useCreateSource } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { CHECK_INTERVAL_OPTIONS } from '../../constants/trend-radar-constants';

export function AddSourceModal() {
  const { isAddSourceModalOpen, closeAddSourceModal } = useTrendRadarStore();
  const createMutation = useCreateSource();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [checkInterval, setCheckInterval] = useState(360);

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        url: url.trim(),
        checkInterval,
        category: category.trim() || undefined,
      });
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    closeAddSourceModal();
    setName('');
    setUrl('');
    setCategory('');
    setCheckInterval(360);
  };

  return (
    <Modal
      isOpen={isAddSourceModalOpen}
      onClose={handleClose}
      title="Add Trend Source"
      subtitle="Add a website to monitor for market trends"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
            disabled={!name.trim() || !url.trim()}
          >
            Add Source
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. McKinsey Digital"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">URL</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/insights"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Category <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Technology, Marketing, Industry"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Check Interval */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Check Frequency</label>
          <select
            value={checkInterval}
            onChange={(e) => setCheckInterval(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          >
            {CHECK_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            {createMutation.error instanceof Error ? createMutation.error.message : 'Failed to add source'}
          </p>
        )}
      </div>
    </Modal>
  );
}
