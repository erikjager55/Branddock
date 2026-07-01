'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, AlertCircle } from 'lucide-react';
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
  const { t } = useTranslation('media-library');
  const isOpen = useMediaLibraryStore((s) => s.isCreateCollectionModalOpen);
  const setOpen = useMediaLibraryStore((s) => s.setCreateCollectionModalOpen);

  const createCollection = useCreateCollection();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedColor(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMessage(null);
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
        onError: (err) => {
          setErrorMessage(
            err instanceof Error && err.message.includes('already exists')
              ? t('collections.createModal.errorExists')
              : t('collections.createModal.errorGeneric'),
          );
        },
      },
    );
  };

  const canSubmit = name.trim().length > 0 && !createCollection.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('collections.createModal.title')}
      subtitle={t('collections.createModal.subtitle')}
      size="sm"
      zIndex={60}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="md" onClick={handleClose}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={FolderOpen}
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={createCollection.isPending}
          >
            {t('collections.createCollection')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.name')} <span className="text-red-500">*</span>
          </label>
          <input
            id="collection-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('collections.createModal.namePlaceholder')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="collection-description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.description')}
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('collections.createModal.descriptionPlaceholder')}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={500}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('fields.color')}
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
