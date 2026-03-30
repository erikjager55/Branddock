'use client';

import { useState } from 'react';
import { Video, Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/shared';
import { useGenerateAiVideo } from '@/features/media-library/hooks';
import type { VideoProvider } from '@/features/media-library/types/media.types';

// ─── Constants ──────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
] as const;

const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
] as const;

// ─── Types ──────────────────────────────────────────────────

interface GenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Modal for generating AI videos via Runway ML. */
export function GenerateVideoModal({ isOpen, onClose }: GenerateVideoModalProps) {
  const generateVideo = useGenerateAiVideo();

  const [provider] = useState<VideoProvider>('RUNWAY');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<5 | 10>(5);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const resetForm = () => {
    setName('');
    setPrompt('');
    setDuration(5);
    setAspectRatio('16:9');
    generateVideo.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerate = () => {
    generateVideo.mutate(
      {
        name: name.trim(),
        prompt: prompt.trim(),
        provider,
        duration,
        aspectRatio,
      },
      { onSuccess: handleClose },
    );
  };

  const isValid = name.trim().length > 0 && prompt.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate AI Video" size="lg">
      <div className="space-y-5">
        {/* Provider selector — only Runway for now */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              className="p-3 rounded-lg border-2 border-indigo-500 bg-indigo-50 text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-900">Runway ML</span>
              </div>
              <p className="text-xs text-gray-500">gen4.5 &middot; $0.05/sec</p>
            </button>

            <button
              type="button"
              disabled
              className="p-3 rounded-lg border-2 border-gray-200 text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-400">Kling</span>
              </div>
              <p className="text-xs text-gray-400">Coming soon</p>
            </button>

            <button
              type="button"
              disabled
              className="p-3 rounded-lg border-2 border-gray-200 text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-400">fal.ai</span>
              </div>
              <p className="text-xs text-gray-400">Coming soon</p>
            </button>
          </div>
        </div>

        {/* Name */}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 200))}
          placeholder="e.g. Product launch teaser"
        />

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
            placeholder="Describe the video you want to generate..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {prompt.length}/1000
          </p>
        </div>

        {/* Duration + Aspect Ratio */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDuration(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    duration === opt.value
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {ASPECT_RATIO_OPTIONS.map((ar) => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Generation note */}
        {generateVideo.isPending && (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            <p className="text-sm text-indigo-700">
              Generating video... This may take 30-120 seconds.
            </p>
          </div>
        )}

        {/* Error feedback */}
        {generateVideo.isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3" role="alert">
            <p className="text-sm text-red-700">
              {(generateVideo.error as Error)?.message || 'Failed to generate video. Please try again.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={generateVideo.isPending}>
            Cancel
          </Button>
          <Button
            icon={Video}
            onClick={handleGenerate}
            disabled={!isValid || generateVideo.isPending}
            isLoading={generateVideo.isPending}
          >
            {generateVideo.isPending ? 'Generating...' : 'Generate Video'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
