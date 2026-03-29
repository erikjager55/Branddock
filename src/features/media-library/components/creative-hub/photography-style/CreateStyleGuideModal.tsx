'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@/components/shared';
import { useCreateStyleReference } from '@/features/media-library/hooks';

interface CreateStyleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Modal form for creating a new photography style reference. */
export function CreateStyleGuideModal({ isOpen, onClose }: CreateStyleGuideModalProps) {
  const createMutation = useCreateStyleReference();

  const [name, setName] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [modelDescription, setModelDescription] = useState('');

  function resetForm() {
    setName('');
    setStylePrompt('');
    setNegativePrompt('');
    setModelDescription('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate(
      {
        name: name.trim(),
        type: 'PHOTOGRAPHY_STYLE',
        stylePrompt: stylePrompt.trim() || undefined,
        negativePrompt: negativePrompt.trim() || undefined,
        modelDescription: modelDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }

  const canSubmit = name.trim().length > 0 && !createMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Photography Style"
      subtitle="Define a visual style guide for your brand photography."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
            disabled={!canSubmit}
          >
            Create Style
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="photography-style-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="photography-style-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Warm Editorial, Cinematic Moody"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Style Prompt */}
        <div>
          <label htmlFor="photography-style-prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Style Prompt
          </label>
          <p className="text-xs text-gray-500 mb-1.5">
            Describe the photography style -- color grading, composition, mood, lighting, depth of field.
          </p>
          <textarea
            id="photography-style-prompt"
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="Warm golden hour lighting, shallow depth of field, desaturated greens with warm highlights, natural candid composition..."
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={2000}
          />
        </div>

        {/* Negative Prompt */}
        <div>
          <label htmlFor="photography-negative-prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Negative Prompt
          </label>
          <p className="text-xs text-gray-500 mb-1.5">
            Describe what to avoid in this photography style.
          </p>
          <textarea
            id="photography-negative-prompt"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Overexposed, flat lighting, harsh shadows, overly saturated colors, heavy HDR..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={1000}
          />
        </div>

        {/* Notes / Model Description */}
        <div>
          <label htmlFor="photography-model-desc" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="photography-model-desc"
            value={modelDescription}
            onChange={(e) => setModelDescription(e.target.value)}
            placeholder="Optional notes about when or how to use this style..."
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={500}
          />
        </div>

        {/* Error message */}
        {createMutation.isError && (
          <p className="text-sm text-red-600" role="alert">
            Failed to create style.{' '}
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Please try again.'}
          </p>
        )}
      </form>
    </Modal>
  );
}
