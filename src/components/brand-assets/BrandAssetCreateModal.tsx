// =============================================================
// BrandAssetCreateModal — modal for creating a new brand asset
//
// Uses shared primitives: Modal, Input, Select, Button.
// Submits to POST /api/brand-assets.
// =============================================================

'use client';

import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Input } from '@/components/shared/Input';
import { Select, type SelectOption } from '@/components/shared/Select';
import { Button } from '@/components/shared/Button';
import type { AssetCategory, CreateBrandAssetBody } from '@/types/brand-asset';

// ─── Category options ────────────────────────────────────

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'PURPOSE',        label: 'Purpose' },
  { value: 'CORE',           label: 'Core' },
  { value: 'PERSONALITY',    label: 'Personality' },
  { value: 'COMMUNICATION',  label: 'Communication' },
  { value: 'STRATEGY',       label: 'Strategy' },
  { value: 'NARRATIVE',      label: 'Narrative' },
  { value: 'FOUNDATION',     label: 'Foundation' },
  { value: 'CULTURE',        label: 'Culture' },
];

// ─── Props ───────────────────────────────────────────────

export interface BrandAssetCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful creation. Receives the created body for optimistic updates. */
  onCreated?: (body: CreateBrandAssetBody) => void;
}

// ─── Component ───────────────────────────────────────────

export function BrandAssetCreateModal({
  isOpen,
  onClose,
  onCreated,
}: BrandAssetCreateModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Reset form ──
  const resetForm = useCallback(() => {
    setName('');
    setCategory(null);
    setDescription('');
    setError(null);
  }, []);

  // ── Close handler ──
  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }, [isSubmitting, resetForm, onClose]);

  // ── Submit handler ──
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Name is required.');
        return;
      }
      if (!category) {
        setError('Category is required.');
        return;
      }

      const body: CreateBrandAssetBody = {
        name: trimmedName,
        category: category as AssetCategory,
        ...(description.trim() ? { description: description.trim() } : {}),
      };

      setIsSubmitting(true);
      try {
        const res = await fetch('/api/brand-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to create asset (${res.status})`);
        }

        // Success — notify parent and close
        onCreated?.(body);
        resetForm();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, category, description, onCreated, resetForm, onClose],
  );

  const footer = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button variant="secondary" size="sm" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        icon={Plus}
        onClick={handleSubmit}
        isLoading={isSubmitting}
        disabled={isSubmitting}
        data-testid="create-asset-submit"
      >
        {isSubmitting ? 'Creating...' : 'Create Asset'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Brand Asset"
      subtitle="Add a new asset to your brand foundation."
      size="md"
      footer={footer}
      data-testid="create-asset-modal"
    >
      <form onSubmit={handleSubmit} data-testid="create-asset-form" className="space-y-4">
        {error && (
          <div data-testid="error-message" role="alert" className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Input
          label="Name"
          required
          placeholder="e.g., Brand Purpose, Tone of Voice"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          autoFocus
          data-testid="create-asset-name"
        />

        <Select
          label="Category"
          required
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS}
          placeholder="Select a category..."
          disabled={isSubmitting}
          data-testid="create-asset-category"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this brand asset..."
            disabled={isSubmitting}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-shadow resize-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>
      </form>
    </Modal>
  );
}
