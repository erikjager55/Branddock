'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@/components/shared';
import { useCreateStyleReference } from '@/features/media-library/hooks';

interface CreateAnimationStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Modal form for creating a new animation style reference. */
export function CreateAnimationStyleModal({ isOpen, onClose }: CreateAnimationStyleModalProps) {
  const createMutation = useCreateStyleReference();

  const [name, setName] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');

  function resetForm() {
    setName('');
    setStylePrompt('');
    setNegativePrompt('');
    setModelName('');
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
        type: 'ANIMATION_STYLE',
        stylePrompt: stylePrompt.trim() || undefined,
        negativePrompt: negativePrompt.trim() || undefined,
        modelName: modelName.trim() || undefined,
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
      title="Create Animation Style"
      subtitle="Define a new animation style reference for motion design."
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
          <label htmlFor="animation-style-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="animation-style-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Smooth 2D Motion, Kinetic Typography"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={100}
            autoFocus
          />
        </div>

        {/* Style Prompt */}
        <div>
          <label htmlFor="animation-style-prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Style Prompt
          </label>
          <p className="text-xs text-gray-500 mb-1.5">
            Describe the animation style -- easing, motion curves, transitions, visual effects.
          </p>
          <textarea
            id="animation-style-prompt"
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="Smooth easing with slight overshoot, organic motion paths, minimal particle effects, clean transitions between scenes..."
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={2000}
          />
        </div>

        {/* Negative Prompt */}
        <div>
          <label htmlFor="animation-negative-prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Negative Prompt
          </label>
          <p className="text-xs text-gray-500 mb-1.5">
            Describe what to avoid in this animation style.
          </p>
          <textarea
            id="animation-negative-prompt"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Harsh cuts, jittery motion, excessive bounce effects, strobe effects..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={1000}
          />
        </div>

        {/* Model Name / Animation Engine */}
        <div>
          <label htmlFor="animation-model-name" className="block text-sm font-medium text-gray-700 mb-1">
            Animation Engine / Tool
          </label>
          <input
            id="animation-model-name"
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g., After Effects, Lottie, Rive, SVG SMIL"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="animation-model-desc" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="animation-model-desc"
            value={modelDescription}
            onChange={(e) => setModelDescription(e.target.value)}
            placeholder="Additional context about this animation style, when to use it, target platforms..."
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            maxLength={500}
          />
        </div>

        {/* Error message */}
        {createMutation.isError && (
          <p className="text-sm text-red-600" role="alert">
            Failed to create animation style.{' '}
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Please try again.'}
          </p>
        )}
      </form>
    </Modal>
  );
}
