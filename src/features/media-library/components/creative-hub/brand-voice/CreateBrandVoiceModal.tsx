'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Button, Input, Select } from '@/components/shared';
import { useCreateBrandVoice } from '@/features/media-library/hooks';
import type { CreateBrandVoiceBody } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface CreateBrandVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Other', label: 'Other' },
];

const AGE_OPTIONS = [
  { value: 'Young', label: 'Young' },
  { value: 'Middle-aged', label: 'Middle-aged' },
  { value: 'Mature', label: 'Mature' },
];

const PACE_OPTIONS = [
  { value: 'Slow', label: 'Slow' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Fast', label: 'Fast' },
];

// ─── Initial State ──────────────────────────────────────────

const INITIAL_FORM: CreateBrandVoiceBody = {
  name: '',
  voiceGender: undefined,
  voiceAge: undefined,
  voiceTone: undefined,
  voiceAccent: undefined,
  speakingPace: undefined,
  voicePrompt: undefined,
  isDefault: false,
};

// ─── Component ──────────────────────────────────────────────

/** Modal form for creating a new brand voice profile. */
export function CreateBrandVoiceModal({ isOpen, onClose }: CreateBrandVoiceModalProps) {
  const [form, setForm] = useState<CreateBrandVoiceBody>({ ...INITIAL_FORM });
  const [nameError, setNameError] = useState<string | null>(null);
  const createBrandVoice = useCreateBrandVoice();

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setNameError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate name
      const trimmedName = form.name.trim();
      if (!trimmedName) {
        setNameError('Voice name is required');
        return;
      }
      setNameError(null);

      // Build body — only include defined values
      const body: CreateBrandVoiceBody = {
        name: trimmedName,
      };
      if (form.voiceGender) body.voiceGender = form.voiceGender;
      if (form.voiceAge) body.voiceAge = form.voiceAge;
      if (form.voiceTone) body.voiceTone = form.voiceTone;
      if (form.voiceAccent) body.voiceAccent = form.voiceAccent;
      if (form.speakingPace) body.speakingPace = form.speakingPace;
      if (form.voicePrompt) body.voicePrompt = form.voicePrompt;
      if (form.isDefault) body.isDefault = true;

      createBrandVoice.mutate(body, {
        onSuccess: () => {
          handleClose();
        },
      });
    },
    [form, createBrandVoice, handleClose],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Brand Voice"
      subtitle="Define your brand's audio identity and voice characteristics."
      size="lg"
      data-testid="create-brand-voice-modal"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={createBrandVoice.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={createBrandVoice.isPending}
            disabled={!form.name.trim()}
          >
            Create Voice
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name — required */}
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, name: e.target.value }));
            if (nameError) setNameError(null);
          }}
          placeholder="e.g., Brand Narrator"
          error={nameError ?? undefined}
          required
        />

        {/* Voice characteristics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Gender"
            value={form.voiceGender ?? null}
            onChange={(value) => setForm((prev) => ({ ...prev, voiceGender: value ?? undefined }))}
            options={GENDER_OPTIONS}
            placeholder="Select..."
          />

          <Select
            label="Age"
            value={form.voiceAge ?? null}
            onChange={(value) => setForm((prev) => ({ ...prev, voiceAge: value ?? undefined }))}
            options={AGE_OPTIONS}
            placeholder="Select..."
          />

          <Select
            label="Speaking Pace"
            value={form.speakingPace ?? null}
            onChange={(value) => setForm((prev) => ({ ...prev, speakingPace: value ?? undefined }))}
            options={PACE_OPTIONS}
            placeholder="Select..."
          />
        </div>

        {/* Tone */}
        <Input
          label="Tone"
          value={form.voiceTone ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, voiceTone: e.target.value || undefined }))}
          placeholder='e.g., "Warm and authoritative"'
          helperText="Describe the overall vocal tone and feeling"
        />

        {/* Accent */}
        <Input
          label="Accent"
          value={form.voiceAccent ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, voiceAccent: e.target.value || undefined }))}
          placeholder='e.g., "Neutral American"'
          helperText="Specify the preferred accent or dialect"
        />

        {/* Voice Prompt — textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Voice Prompt
          </label>
          <textarea
            value={form.voicePrompt ?? ''}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, voicePrompt: e.target.value || undefined }))
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow min-h-[80px] resize-y"
            placeholder="Describe the voice characteristics in detail for AI generation. Include personality traits, speaking style, emotional register, and any specific instructions..."
            rows={3}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Detailed description used to guide AI voice generation
          </p>
        </div>

        {/* Is Default — checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault ?? false}
            onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">Set as default brand voice</span>
        </label>

        {/* Mutation error */}
        {createBrandVoice.isError && (
          <p className="text-xs text-red-500" role="alert">
            Failed to create brand voice. Please try again.
          </p>
        )}
      </form>
    </Modal>
  );
}
