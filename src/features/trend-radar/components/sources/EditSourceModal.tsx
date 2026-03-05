'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useSourceDetail, useUpdateSource } from '../../hooks';
import { useTrendRadarStore } from '../../stores/useTrendRadarStore';
import { CHECK_INTERVAL_OPTIONS } from '../../constants/trend-radar-constants';

export function EditSourceModal() {
  const { isEditSourceModalOpen, closeEditSourceModal, selectedSourceId } = useTrendRadarStore();
  const { data: source } = useSourceDetail(isEditSourceModalOpen ? selectedSourceId : null);
  const updateMutation = useUpdateSource();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [checkInterval, setCheckInterval] = useState(360);

  useEffect(() => {
    if (source) {
      setName(source.name);
      setUrl(source.url);
      setCategory(source.category ?? '');
      setCheckInterval(source.checkInterval);
    }
  }, [source]);

  const handleSubmit = async () => {
    if (!selectedSourceId || !name.trim() || !url.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedSourceId,
        body: {
          name: name.trim(),
          url: url.trim(),
          checkInterval,
          category: category.trim() || undefined,
        },
      });
      closeEditSourceModal();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Modal
      isOpen={isEditSourceModalOpen}
      onClose={closeEditSourceModal}
      title="Edit Trend Source"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={closeEditSourceModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={updateMutation.isPending}
            disabled={!name.trim() || !url.trim()}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">URL</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Technology, Marketing"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
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
      </div>
    </Modal>
  );
}
