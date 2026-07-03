'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, Select } from '@/components/shared';
import { Upload, Music2 } from 'lucide-react';
import { useUploadSoundEffect } from '@/features/media-library/hooks';
import type { SoundType } from '@/features/media-library/types/media.types';

// ─── Types ──────────────────────────────────────────────────

interface UploadSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const SOUND_TYPE_VALUES = ['SFX', 'JINGLE', 'SOUND_LOGO', 'AMBIENT', 'MUSIC'] as const;

const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/webm'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ─── Component ──────────────────────────────────────────────

/** Modal for uploading a sound effect file. */
export function UploadSoundModal({ isOpen, onClose }: UploadSoundModalProps) {
  const { t } = useTranslation('media-library');
  const soundTypeOptions = SOUND_TYPE_VALUES.map((v) => ({ value: v, label: t(`soundTypes.${v}`) }));
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [soundType, setSoundType] = useState<SoundType>('SFX');
  const [fileError, setFileError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSoundEffect = useUploadSoundEffect();

  const resetMutation = uploadSoundEffect.reset;
  const resetForm = useCallback(() => {
    setFile(null);
    setName('');
    setSoundType('SFX');
    setFileError(null);
    setNameError(null);
    resetMutation();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [resetMutation]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validateFile = useCallback((f: File): boolean => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError(t('soundEffects.uploadModal.invalidType'));
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError(t('soundEffects.uploadModal.tooLarge'));
      return false;
    }
    setFileError(null);
    return true;
  }, [t]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (validateFile(f)) {
        setFile(f);
        if (!name) {
          setName(f.name.replace(/\.[^.]+$/, ''));
        }
      }
    },
    [name, validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (!f) return;
      if (validateFile(f)) {
        setFile(f);
        if (!name) {
          setName(f.name.replace(/\.[^.]+$/, ''));
        }
      }
    },
    [name, validateFile],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (uploadSoundEffect.isPending) return;

      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError(t('soundEffects.nameRequired'));
        return;
      }
      setNameError(null);

      if (!file) {
        setFileError(t('soundEffects.uploadModal.selectFile'));
        return;
      }

      uploadSoundEffect.mutate(
        { file, body: { name: trimmedName, soundType } },
        { onSuccess: () => handleClose() },
      );
    },
    [file, name, soundType, uploadSoundEffect, handleClose, t],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('soundEffects.uploadModal.title')}
      subtitle={t('soundEffects.uploadModal.subtitle')}
      size="md"
      data-testid="upload-sound-modal"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={uploadSoundEffect.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={uploadSoundEffect.isPending}
            disabled={!file || !name.trim() || uploadSoundEffect.isPending}
          >
            {t('soundEffects.uploadModal.upload')}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            file
              ? 'border-purple-300 bg-purple-50/50'
              : fileError
                ? 'border-red-300 bg-red-50/30'
                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
          }`}
          role="button"
          tabIndex={0}
          aria-label={t('soundEffects.uploadModal.selectFileAria')}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/webm"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <Music2 className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-900 font-medium">{file.name}</span>
              <span className="text-xs text-gray-500">
                ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {t('soundEffects.uploadModal.dropText')} <span className="text-purple-600 font-medium">{t('soundEffects.uploadModal.browse')}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('soundEffects.uploadModal.formats')}
              </p>
            </>
          )}
        </div>
        {fileError && (
          <p className="text-xs text-red-500" role="alert">{fileError}</p>
        )}

        {/* Name */}
        <Input
          label={t('fields.name')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          placeholder={t('soundEffects.uploadModal.namePlaceholder')}
          maxLength={200}
          error={nameError ?? undefined}
          required
        />

        {/* Sound Type */}
        <Select
          label={t('soundEffects.soundType')}
          value={soundType}
          onChange={(value) => setSoundType((value ?? 'SFX') as SoundType)}
          options={soundTypeOptions}
        />

        {/* Mutation error */}
        {uploadSoundEffect.isError && (
          <p className="text-xs text-red-500" role="alert">
            {t('soundEffects.uploadModal.error')}
          </p>
        )}
      </form>
    </Modal>
  );
}
