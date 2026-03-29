'use client';

import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Modal, Button } from '@/components/shared';
import { useCreateCollection } from '../../hooks/index';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';

// ─── Preset colors ────────────────────────────────────────

const PRESET_COLORS = [
  { value: '#6366F1', label: 'Indigo' },
  { value: '#0D9488', label: 'Teal' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#3B82F6', label: 'Blue' },
] as const;

// ─── Component ────────────────────────────────────────────

/** Modal form for creating a new media collection. */
export function CreateCollectionModal() {
  const isOpen = useMediaLibraryStore((s) => s.isCreateCollectionModalOpen);
  const setOpen = useMediaLibraryStore((s) => s.setCreateCollectionModalOpen);

  const createCollection = useCreateCollection();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedColor(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCollection.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor ?? undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const canSubmit = name.trim().length > 0 && !createCollection.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Collection"
      subtitle="Organize your media assets into collections."
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={FolderOpen}
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={createCollection.isPending}
          >
            Create Collection
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="collection-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Photos, Brand Assets..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="collection-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this collection..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={500}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                onClick={() =>
                  setSelectedColor(
                    selectedColor === color.value ? null : color.value,
                  )
                }
                className="w-8 h-8 rounded-full border-2 transition-all duration-150 flex-shrink-0"
                style={{
                  backgroundColor: color.value,
                  borderColor:
                    selectedColor === color.value ? color.value : 'transparent',
                  boxShadow:
                    selectedColor === color.value
                      ? `0 0 0 2px white, 0 0 0 4px ${color.value}`
                      : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
