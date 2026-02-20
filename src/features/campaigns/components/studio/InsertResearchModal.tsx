'use client';

import React from 'react';
import { AlignLeft, Quote, BarChart3, Sparkles } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useContentStudioStore } from '@/stores/useContentStudioStore';
import { useInsertInsight } from '../../hooks/studio.hooks';
import { InsertFormatCard } from './InsertFormatCard';
import type { InsertFormatType, InsertLocationType } from '@/types/studio';

// ─── Types ─────────────────────────────────────────────

interface InsertResearchModalProps {
  deliverableId: string;
  insightTitle: string;
}

// ─── Format definitions ────────────────────────────────

const FORMAT_OPTIONS: Array<{
  format: InsertFormatType;
  label: string;
  description: string;
  icon: typeof AlignLeft;
}> = [
  {
    format: 'INLINE',
    label: 'Inline',
    description: 'Insert as inline text',
    icon: AlignLeft,
  },
  {
    format: 'QUOTE',
    label: 'Quote',
    description: 'Insert as a blockquote',
    icon: Quote,
  },
  {
    format: 'DATA_VIZ',
    label: 'Data Visualization',
    description: 'Insert as a data chart',
    icon: BarChart3,
  },
  {
    format: 'AI_ADAPTED',
    label: 'AI Adapted',
    description: 'AI rewrites for context',
    icon: Sparkles,
  },
];

// ─── Component ─────────────────────────────────────────

export function InsertResearchModal({ deliverableId, insightTitle }: InsertResearchModalProps) {
  const isOpen = useContentStudioStore((s) => s.isInsertModalOpen);
  const setIsOpen = useContentStudioStore((s) => s.setIsInsertModalOpen);
  const selectedInsightId = useContentStudioStore((s) => s.selectedInsightId);
  const selectedFormat = useContentStudioStore((s) => s.selectedInsertFormat);
  const setSelectedFormat = useContentStudioStore((s) => s.setSelectedInsertFormat);
  const selectedLocation = useContentStudioStore((s) => s.selectedInsertLocation);
  const setSelectedLocation = useContentStudioStore((s) => s.setSelectedInsertLocation);

  const insertMutation = useInsertInsight(deliverableId);

  const handleInsert = () => {
    if (!selectedInsightId || !selectedFormat) return;
    insertMutation.mutate(
      {
        insightId: selectedInsightId,
        format: selectedFormat,
        location: selectedLocation,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Insert Research Insight"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="cta"
            onClick={handleInsert}
            disabled={!selectedFormat}
            isLoading={insertMutation.isPending}
          >
            Insert
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Insight title */}
        <p className="text-sm text-gray-700 font-medium">{insightTitle}</p>

        {/* Format selection — 2x2 grid */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-3">Insert Format</p>
          <div className="grid grid-cols-2 gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <InsertFormatCard
                key={opt.format}
                format={opt.format}
                label={opt.label}
                description={opt.description}
                icon={opt.icon}
                isSelected={selectedFormat === opt.format}
                onSelect={(f) => setSelectedFormat(f)}
              />
            ))}
          </div>
        </div>

        {/* Location selector */}
        <div>
          <p className="text-sm font-medium text-gray-900 mb-3">Insert Location</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="insert-location"
                value="cursor"
                checked={selectedLocation === 'cursor'}
                onChange={() => setSelectedLocation('cursor')}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">At Cursor</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="insert-location"
                value="ai"
                checked={selectedLocation === 'ai'}
                onChange={() => setSelectedLocation('ai')}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-700">AI-Determined</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default InsertResearchModal;
