'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/shared';
import type { GoldenCircleData, GoldenCircleRing } from '../types/golden-circle.types';

const RING_CONFIG: Record<GoldenCircleRing, { title: string; statementLabel: string; detailsLabel: string }> = {
  why: {
    title: 'Edit WHY — Purpose',
    statementLabel: 'Why does your organization exist?',
    detailsLabel: 'Supporting details or context',
  },
  how: {
    title: 'Edit HOW — Process',
    statementLabel: 'How do you deliver on your purpose?',
    detailsLabel: 'Supporting details or context',
  },
  what: {
    title: 'Edit WHAT — Product',
    statementLabel: 'What do you offer?',
    detailsLabel: 'Supporting details or context',
  },
};

interface GoldenCircleEditModalProps {
  isOpen: boolean;
  ring: GoldenCircleRing | null;
  data: GoldenCircleData;
  onClose: () => void;
  onSave: (data: {
    [K in GoldenCircleRing]?: { statement: string; details: string };
  }) => void;
  isSaving: boolean;
}

export function GoldenCircleEditModal({
  isOpen,
  ring,
  data,
  onClose,
  onSave,
  isSaving,
}: GoldenCircleEditModalProps) {
  const config = ring ? RING_CONFIG[ring] : null;

  const getStatement = (r: GoldenCircleRing | null) => {
    if (!r) return '';
    switch (r) {
      case 'why': return data.whyStatement;
      case 'how': return data.howStatement;
      case 'what': return data.whatStatement;
    }
  };

  const getDetails = (r: GoldenCircleRing | null) => {
    if (!r) return '';
    switch (r) {
      case 'why': return data.whyDetails;
      case 'how': return data.howDetails;
      case 'what': return data.whatDetails;
    }
  };

  const [statement, setStatement] = useState('');
  const [details, setDetails] = useState('');

  // Reset state when ring changes
  useEffect(() => {
    if (ring && isOpen) {
      setStatement(getStatement(ring));
      setDetails(getDetails(ring));
    }
  }, [ring, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ring || !config) return null;

  const handleSave = () => {
    onSave({ [ring]: { statement, details } });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.statementLabel}
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Enter the statement..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {config.detailsLabel}
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add supporting details..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="cta" size="md" onClick={handleSave} isLoading={isSaving}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}
