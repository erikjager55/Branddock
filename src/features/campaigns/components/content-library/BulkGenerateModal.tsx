'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from '@/components/shared';
import { Sparkles, Info } from 'lucide-react';
import { DELIVERABLE_TYPES, DELIVERABLE_CATEGORIES } from '../../lib/deliverable-types';
import { useBulkCreateDeliverables } from '../../hooks';
import type { DeliverableResponse } from '@/types/campaign';

interface BulkGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  /** All deliverables in this campaign — used to populate the "Based on" dropdown. */
  deliverables: DeliverableResponse[];
  /** Kicked off after creation with the new deliverable IDs; typically `useBulkGenerate.start`. */
  onCreated: (newDeliverableIds: string[]) => void;
}

const MAX_QUANTITY = 10;
const DEFAULT_QUANTITY = 5;

/**
 * Sprint B · Step 2 — bulk generate modal.
 *
 * The user picks a content type + quantity + optional source deliverable +
 * optional briefing guidance. Submit creates the N deliverables server-side
 * (inheriting settings when appropriate) and then hands their IDs to the
 * existing `useBulkGenerate` SSE pipeline for parallel content generation.
 */
export function BulkGenerateModal({
  isOpen,
  onClose,
  campaignId,
  deliverables,
  onCreated,
}: BulkGenerateModalProps) {
  const bulkCreate = useBulkCreateDeliverables(campaignId);

  const [contentType, setContentType] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(DEFAULT_QUANTITY);
  const [sourceDeliverableId, setSourceDeliverableId] = useState<string>('');
  const [briefGuidance, setBriefGuidance] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the modal opens so stale state from a prior batch
  // doesn't bleed into the next run.
  useEffect(() => {
    if (isOpen) {
      setContentType('');
      setQuantity(DEFAULT_QUANTITY);
      setSourceDeliverableId('');
      setBriefGuidance('');
      setError(null);
    }
  }, [isOpen]);

  // COMPLETED deliverables are the meaningful sources — a draft has no
  // proven brief / settings to inherit from yet. Sort newest first so the
  // most recent context sits at the top of the dropdown.
  const completedDeliverables = useMemo(
    () =>
      deliverables
        .filter((d) => d.status === 'COMPLETED')
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [deliverables],
  );

  // Auto-pick the most recent COMPLETED of the selected type as the default
  // source — matches the user's likely intent ("generate 5 more like this").
  useEffect(() => {
    if (!contentType) {
      setSourceDeliverableId('');
      return;
    }
    const match = completedDeliverables.find((d) => d.contentType === contentType);
    setSourceDeliverableId(match?.id ?? '');
  }, [contentType, completedDeliverables]);

  const canSubmit =
    !!contentType &&
    quantity >= 1 &&
    quantity <= MAX_QUANTITY &&
    !bulkCreate.isPending;

  const handleSubmit = async () => {
    setError(null);
    try {
      const result = await bulkCreate.mutateAsync({
        contentType,
        quantity,
        sourceDeliverableId: sourceDeliverableId || undefined,
        briefGuidance: briefGuidance.trim() || undefined,
      });
      onCreated(result.deliverables.map((d) => d.id));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const selectedSource = useMemo(
    () => completedDeliverables.find((d) => d.id === sourceDeliverableId) ?? null,
    [completedDeliverables, sourceDeliverableId],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate more content"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={bulkCreate.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={bulkCreate.isPending}
            icon={Sparkles}
          >
            Generate {quantity}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Content Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Content Type <span className="text-red-500">*</span>
          </label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">Pick a content type…</option>
            {DELIVERABLE_CATEGORIES.map((cat) => (
              <optgroup key={cat} label={cat}>
                {DELIVERABLE_TYPES.filter((dt) => dt.category === cat).map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity <span className="text-gray-400 font-normal">(max {MAX_QUANTITY})</span>
          </label>
          <input
            type="number"
            min={1}
            max={MAX_QUANTITY}
            value={quantity}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n)) {
                setQuantity(Math.max(1, Math.min(MAX_QUANTITY, n)));
              }
            }}
            className="w-24 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* Based on */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Based on <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            value={sourceDeliverableId}
            onChange={(e) => setSourceDeliverableId(e.target.value)}
            disabled={completedDeliverables.length === 0}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">No source (fresh brief)</option>
            {completedDeliverables.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} — {d.contentType}
              </option>
            ))}
          </select>
          {selectedSource && (
            <p className="mt-1 flex items-start gap-1 text-[11px] text-teal-700">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {selectedSource.contentType === contentType
                ? 'Briefing, medium config, and type-specific inputs will be inherited.'
                : 'Briefing + persona will be inherited. Medium config is skipped (different type).'}
            </p>
          )}
          {completedDeliverables.length === 0 && (
            <p className="mt-1 text-[11px] text-gray-400">
              No completed deliverables in this campaign yet — new items will start fresh.
            </p>
          )}
        </div>

        {/* Optional guidance */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Optional guidance
          </label>
          <textarea
            value={briefGuidance}
            onChange={(e) => setBriefGuidance(e.target.value)}
            placeholder="e.g. Focus on our new AI feature launch. Target mid-funnel users who've already seen the teaser campaign."
            rows={3}
            maxLength={2000}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
          />
          <p className="mt-1 text-[11px] text-gray-400 text-right">
            {briefGuidance.length}/2000
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}
      </div>
    </Modal>
  );
}
