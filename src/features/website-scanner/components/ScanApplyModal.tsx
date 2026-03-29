'use client';

import React, { useState } from 'react';
import { Shield, Users, Package, Swords, CheckCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/shared';
import { useWebsiteScannerStore } from '../stores/useWebsiteScannerStore';
import { useScanProgress, useApplyResults } from '../hooks';

interface ScanApplyModalProps {
  onNavigate: (section: string) => void;
}

const CATEGORIES = [
  { key: 'brandAssets', label: 'Brand Foundation', icon: Shield, color: 'teal' },
  { key: 'personas', label: 'Personas', icon: Users, color: 'blue' },
  { key: 'products', label: 'Products & Services', icon: Package, color: 'purple' },
  { key: 'competitors', label: 'Competitors', icon: Swords, color: 'amber' },
] as const;

export function ScanApplyModal({ onNavigate }: ScanApplyModalProps) {
  const { jobId, closeApplyModal, setViewState } = useWebsiteScannerStore();
  const { data: progress } = useScanProgress(jobId);
  const applyMutation = useApplyResults();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map(c => c.key))
  );

  const results = progress?.results;
  if (!results || !jobId) return null;

  const counts: Record<string, number> = {
    brandAssets: results.brandAssets.length,
    personas: results.personas.length,
    products: results.products.length,
    competitors: results.competitors.length,
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = selectedCategories.size === CATEGORIES.length;

  const handleApply = async () => {
    const body = allSelected
      ? { applyAll: true }
      : { categories: Array.from(selectedCategories) };

    try {
      await applyMutation.mutateAsync({ jobId, body });
      closeApplyModal();
      setViewState('applied');
    } catch {
      // Error handled by mutation state
    }
  };

  const totalSelected = Array.from(selectedCategories).reduce(
    (sum, key) => sum + (counts[key] ?? 0),
    0,
  );

  return (
    <Modal isOpen onClose={closeApplyModal} title="Apply Scan Results" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Select which categories to apply to your workspace. This will populate your brand profile with the scanned data.
        </p>

        {/* Category checkboxes */}
        <div className="space-y-2">
          {CATEGORIES.map(({ key, label, icon: Icon }) => {
            const count = counts[key];
            const isSelected = selectedCategories.has(key);
            const isDisabled = count === 0;

            return (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isDisabled
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected && !isDisabled}
                  onChange={() => !isDisabled && toggleCategory(key)}
                  disabled={isDisabled}
                  className="rounded border-gray-300 text-primary focus:ring-primary-500"
                />
                <Icon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 flex-1">{label}</span>
                <span className="text-xs text-gray-500">
                  {count} item{count !== 1 ? 's' : ''}
                </span>
              </label>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            <strong>{totalSelected}</strong> items will be applied to your workspace
          </p>
        </div>

        {/* Error */}
        {applyMutation.isError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg" role="alert">
            Failed to apply results. Please try again.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={closeApplyModal}
            className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selectedCategories.size === 0 || applyMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#0D9488' }}
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Apply Results
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
