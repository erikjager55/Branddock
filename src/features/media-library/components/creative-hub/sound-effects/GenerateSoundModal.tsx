'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select } from '@/components/shared';
import { Wand2 } from 'lucide-react';
import { useGenerateSoundEffect } from '@/features/media-library/hooks';
import type { SoundType } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface GenerateSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const SOUND_TYPE_VALUES = ['SFX', 'JINGLE', 'SOUND_LOGO', 'AMBIENT', 'MUSIC'] as const;

// ─── Component ──────────────────────────────────────────────

/** Modal for generating a sound effect via ElevenLabs AI. */
export function GenerateSoundModal({ isOpen, onClose }: GenerateSoundModalProps) {
  const { t } = useTranslation('media-library');
  const soundTypeOptions = SOUND_TYPE_VALUES.map((v) => ({ value: v, label: t(`soundTypes.${v}`) }));
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [soundType, setSoundType] = useState<SoundType>('SFX');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [promptInfluence, setPromptInfluence] = useState(0.3);
  const [nameError, setNameError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const generateSoundEffect = useGenerateSoundEffect();

  const resetMutation = generateSoundEffect.reset;
  const resetForm = useCallback(() => {
    setName('');
    setPrompt('');
    setSoundType('SFX');
    setDurationSeconds('');
    setPromptInfluence(0.3);
    setNameError(null);
    setPromptError(null);
    setDurationError(null);
    resetMutation();
  }, [resetMutation]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (generateSoundEffect.isPending) return;

      const trimmedName = name.trim();
      const trimmedPrompt = prompt.trim();

      let hasError = false;
      if (!trimmedName) {
        setNameError(t('soundEffects.nameRequired'));
        hasError = true;
      } else {
        setNameError(null);
      }
      if (!trimmedPrompt) {
        setPromptError(t('soundEffects.promptRequired'));
        hasError = true;
      } else {
        setPromptError(null);
      }
      if (hasError) return;

      let parsedDuration: number | undefined;
      if (durationSeconds.trim()) {
        const rawDuration = parseFloat(durationSeconds);
        if (!isFinite(rawDuration) || rawDuration < 0.5 || rawDuration > 22) {
          setDurationError(t('soundEffects.generateModal.durationError'));
          return;
        }
        setDurationError(null);
        parsedDuration = rawDuration;
      }

      generateSoundEffect.mutate(
        {
          name: trimmedName,
          prompt: trimmedPrompt,
          soundType,
          durationSeconds: parsedDuration,
          promptInfluence,
        },
        { onSuccess: () => handleClose() },
      );
    },
    [name, prompt, soundType, durationSeconds, promptInfluence, generateSoundEffect, handleClose, t],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('soundEffects.generateModal.title')}
      subtitle={t('soundEffects.generateModal.subtitle')}
      size="md"
      data-testid="generate-sound-modal"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={generateSoundEffect.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={generateSoundEffect.isPending}
            disabled={!name.trim() || !prompt.trim() || generateSoundEffect.isPending}
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            {t('soundEffects.generateModal.generate')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label={t('fields.name')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          placeholder={t('soundEffects.generateModal.namePlaceholder')}
          maxLength={200}
          error={nameError ?? undefined}
          required
        />

        {/* Prompt */}
        <div>
          <label htmlFor="generate-sound-prompt" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('meta.prompt')}
          </label>
          <textarea
            id="generate-sound-prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (promptError) setPromptError(null);
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow min-h-[80px] resize-y"
            placeholder={t('soundEffects.generateModal.promptPlaceholder')}
            maxLength={200}
            rows={3}
            required
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">{prompt.length}/200</span>
            {promptError && (
              <span className="text-xs text-red-500" role="alert">{promptError}</span>
            )}
          </div>
        </div>

        {/* Sound Type */}
        <Select
          label={t('soundEffects.soundType')}
          value={soundType}
          onChange={(value) => setSoundType((value ?? 'SFX') as SoundType)}
          options={soundTypeOptions}
        />

        {/* Duration + Prompt Influence row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="generate-sound-duration" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('soundEffects.generateModal.durationLabel')}
            </label>
            <input
              id="generate-sound-duration"
              type="number"
              min={0.5}
              max={22}
              step={0.5}
              value={durationSeconds}
              onChange={(e) => {
                setDurationSeconds(e.target.value);
                if (durationError) setDurationError(null);
              }}
              placeholder={t('soundEffects.generateModal.durationPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
            />
            <p className="mt-1 text-xs text-gray-400">{t('soundEffects.generateModal.durationHint')}</p>
            {durationError && (
              <p className="mt-0.5 text-xs text-red-500" role="alert">{durationError}</p>
            )}
          </div>

          <div>
            <label htmlFor="generate-sound-influence" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('soundEffects.generateModal.promptInfluence')}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="generate-sound-influence"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={promptInfluence}
                onChange={(e) => setPromptInfluence(parseFloat(e.target.value))}
                className="flex-1 accent-purple-600"
              />
              <span className="text-sm text-gray-700 tabular-nums w-8 text-right">
                {Math.round(promptInfluence * 100)}%
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{t('soundEffects.generateModal.promptInfluenceHint')}</p>
          </div>
        </div>

        {/* Mutation error */}
        {generateSoundEffect.isError && (
          <p className="text-xs text-red-500" role="alert">
            {t('soundEffects.generateModal.error')}
          </p>
        )}
      </form>
    </Modal>
  );
}
