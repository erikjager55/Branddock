'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/shared';
import { useCreateStyleReference } from '../../../hooks/index';

// ─── Types ──────────────────────────────────────────────────

interface CreateBrandModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Modal form for creating a new brand model style reference. */
export function CreateBrandModelModal({ isOpen, onClose }: CreateBrandModelModalProps) {
  const createMutation = useCreateStyleReference();

  const [name, setName] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');

  const resetForm = () => {
    setName('');
    setModelName('');
    setModelDescription('');
    setStylePrompt('');
    setNegativePrompt('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    createMutation.mutate(
      {
        name: name.trim(),
        type: 'BRAND_MODEL',
        modelName: modelName.trim() || undefined,
        modelDescription: modelDescription.trim() || undefined,
        stylePrompt: stylePrompt.trim() || undefined,
        negativePrompt: negativePrompt.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Brand Model"
      subtitle="Define a new visual style reference for AI-generated imagery."
      size="md"
      data-testid="create-brand-model-modal"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            isLoading={createMutation.isPending}
          >
            Create
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          placeholder="e.g., Cinematic Product Style"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-testid="brand-model-name-input"
        />

        <Input
          label="Model Name"
          placeholder="e.g., SDXL 1.0, Midjourney v6"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          helperText="The AI model or checkpoint used for this style."
        />

        <div>
          <label htmlFor="model-description" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            id="model-description"
            rows={2}
            placeholder="Describe the overall visual style..."
            value={modelDescription}
            onChange={(e) => setModelDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
          />
        </div>

        <div>
          <label htmlFor="style-prompt" className="block text-sm font-medium text-gray-700 mb-1.5">
            Style Prompt
          </label>
          <textarea
            id="style-prompt"
            rows={3}
            placeholder="Positive prompt tokens for this style..."
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
          />
        </div>

        <div>
          <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-700 mb-1.5">
            Negative Prompt
          </label>
          <textarea
            id="negative-prompt"
            rows={2}
            placeholder="Things to avoid in generated images..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
