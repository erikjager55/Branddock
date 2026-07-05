'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select } from '@/components/shared';
import { useCreateBrandVoice } from '@/features/media-library/hooks';
import type { CreateBrandVoiceBody } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface CreateBrandVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const GENDER_VALUES = ['Male', 'Female', 'Non-binary', 'Other'] as const;
const AGE_VALUES = ['Young', 'Middle-aged', 'Mature'] as const;
const PACE_VALUES = ['Slow', 'Medium', 'Fast'] as const;

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
  const { t } = useTranslation('media-library');
  const [form, setForm] = useState<CreateBrandVoiceBody>({ ...INITIAL_FORM });
  const [nameError, setNameError] = useState<string | null>(null);
  const createBrandVoice = useCreateBrandVoice();

  const genderOptions = GENDER_VALUES.map((v) => ({ value: v, label: t(`brandVoice.gender.${v}`) }));
  const ageOptions = AGE_VALUES.map((v) => ({ value: v, label: t(`brandVoice.age.${v}`) }));
  const paceOptions = PACE_VALUES.map((v) => ({ value: v, label: t(`brandVoice.pace.${v}`) }));

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
        setNameError(t('brandVoice.createModal.nameRequired'));
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
    [form, createBrandVoice, handleClose, t],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('brandVoice.create')}
      subtitle={t('brandVoice.createModal.subtitle')}
      size="lg"
      data-testid="create-brand-voice-modal"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={createBrandVoice.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={createBrandVoice.isPending}
            disabled={!form.name.trim()}
          >
            {t('brandVoice.createModal.createVoice')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name — required */}
        <Input
          label={t('fields.name')}
          value={form.name}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, name: e.target.value }));
            if (nameError) setNameError(null);
          }}
          placeholder={t('brandVoice.createModal.namePlaceholder')}
          error={nameError ?? undefined}
          required
        />

        {/* Voice characteristics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label={t('brandVoice.createModal.gender')}
            value={form.voiceGender ?? null}
            onChange={(value) => setForm((prev) => ({ ...prev, voiceGender: value ?? undefined }))}
            options={genderOptions}
            placeholder={t('fields.select')}
          />

          <Select
            label={t('brandVoice.createModal.age')}
            value={form.voiceAge ?? null}
            onChange={(value) => setForm((prev) => ({ ...prev, voiceAge: value ?? undefined }))}
            options={ageOptions}
            placeholder={t('fields.select')}
          />

          <Select
            label={t('brandVoice.createModal.speakingPace')}
            value={form.speakingPace ?? null}
            onChange={(value) => setForm((prev) => ({ ...prev, speakingPace: value ?? undefined }))}
            options={paceOptions}
            placeholder={t('fields.select')}
          />
        </div>

        {/* Tone */}
        <Input
          label={t('brandVoice.createModal.tone')}
          value={form.voiceTone ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, voiceTone: e.target.value || undefined }))}
          placeholder={t('brandVoice.createModal.tonePlaceholder')}
          helperText={t('brandVoice.createModal.toneHelp')}
        />

        {/* Accent */}
        <Input
          label={t('brandVoice.createModal.accent')}
          value={form.voiceAccent ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, voiceAccent: e.target.value || undefined }))}
          placeholder={t('brandVoice.createModal.accentPlaceholder')}
          helperText={t('brandVoice.createModal.accentHelp')}
        />

        {/* Voice Prompt — textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('brandVoice.createModal.voicePrompt')}
          </label>
          <textarea
            value={form.voicePrompt ?? ''}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, voicePrompt: e.target.value || undefined }))
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow min-h-[80px] resize-y"
            placeholder={t('brandVoice.createModal.voicePromptPlaceholder')}
            rows={3}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            {t('brandVoice.createModal.voicePromptHelp')}
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
          <span className="text-sm text-gray-700">{t('brandVoice.createModal.setDefault')}</span>
        </label>

        {/* Mutation error */}
        {createBrandVoice.isError && (
          <p className="text-xs text-red-500" role="alert">
            {t('brandVoice.createModal.error')}
          </p>
        )}
      </form>
    </Modal>
  );
}
