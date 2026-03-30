'use client';

import { useState } from 'react';
import { Wand2, Sparkles, ImageIcon } from 'lucide-react';
import { Modal, Button, Input } from '@/components/shared';
import { useGenerateAiImage } from '@/features/media-library/hooks';
import type { ImageProvider } from '@/features/media-library/types/media.types';

// ─── Constants ──────────────────────────────────────────────

const IMAGEN_ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
];

const DALLE_SIZES = [
  { value: '1024x1024', label: '1024x1024 (Square)' },
  { value: '1792x1024', label: '1792x1024 (Landscape)' },
  { value: '1024x1792', label: '1024x1792 (Portrait)' },
] as const;

const DALLE_QUALITY = [
  { value: 'standard', label: 'Standard' },
  { value: 'hd', label: 'HD' },
] as const;

const DALLE_STYLE = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'natural', label: 'Natural' },
] as const;

// ─── Types ──────────────────────────────────────────────────

interface GenerateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Modal for generating AI images via Imagen 4 or DALL-E 3. */
export function GenerateImageModal({ isOpen, onClose }: GenerateImageModalProps) {
  const generateImage = useGenerateAiImage();

  const [provider, setProvider] = useState<ImageProvider>('IMAGEN');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');

  // Imagen options
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // DALL-E options
  const [dalleSize, setDalleSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [dalleQuality, setDalleQuality] = useState<'standard' | 'hd'>('standard');
  const [dalleStyle, setDalleStyle] = useState<'vivid' | 'natural'>('vivid');

  const resetForm = () => {
    setProvider('IMAGEN');
    setName('');
    setPrompt('');
    setAspectRatio('1:1');
    setDalleSize('1024x1024');
    setDalleQuality('standard');
    setDalleStyle('vivid');
    generateImage.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerate = () => {
    generateImage.mutate(
      {
        name: name.trim(),
        prompt: prompt.trim(),
        provider,
        ...(provider === 'IMAGEN'
          ? { aspectRatio }
          : { size: dalleSize, quality: dalleQuality, style: dalleStyle }),
      },
      { onSuccess: handleClose },
    );
  };

  const isValid = name.trim().length > 0 && prompt.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate AI Image" size="lg">
      <div className="space-y-5">
        {/* Provider selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
          <div className="grid grid-cols-2 gap-3">
            {/* Imagen card */}
            <button
              type="button"
              onClick={() => setProvider('IMAGEN')}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                provider === 'IMAGEN'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900">Imagen 4</span>
              </div>
              <p className="text-xs text-gray-500">Google&apos;s latest image model. Flexible aspect ratios.</p>
            </button>

            {/* DALL-E card */}
            <button
              type="button"
              onClick={() => setProvider('DALLE')}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                provider === 'DALLE'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-900">DALL-E 3</span>
              </div>
              <p className="text-xs text-gray-500">OpenAI&apos;s image model. HD quality, vivid or natural style.</p>
            </button>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 200))}
          placeholder="e.g. Brand hero image"
        />

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
            placeholder="Describe the image you want to generate..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {prompt.length}/1000
          </p>
        </div>

        {/* Provider-specific options */}
        {provider === 'IMAGEN' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {IMAGEN_ASPECT_RATIOS.map((ar) => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={dalleSize}
                onChange={(e) => setDalleSize(e.target.value as typeof dalleSize)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {DALLE_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
              <select
                value={dalleQuality}
                onChange={(e) => setDalleQuality(e.target.value as typeof dalleQuality)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {DALLE_QUALITY.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
              <select
                value={dalleStyle}
                onChange={(e) => setDalleStyle(e.target.value as typeof dalleStyle)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {DALLE_STYLE.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Error feedback */}
        {generateImage.isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3" role="alert">
            <p className="text-sm text-red-700">
              {(generateImage.error as Error)?.message || 'Failed to generate image. Please try again.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={generateImage.isPending}>
            Cancel
          </Button>
          <Button
            icon={Wand2}
            onClick={handleGenerate}
            disabled={!isValid || generateImage.isPending}
            isLoading={generateImage.isPending}
          >
            {generateImage.isPending ? 'Generating...' : 'Generate Image'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
