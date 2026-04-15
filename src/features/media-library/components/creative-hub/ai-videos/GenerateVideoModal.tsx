'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Video, Wand2, ChevronRight, Image, X, Loader2, Sparkles } from 'lucide-react';
import { Modal, Button, Input } from '@/components/shared';
import { useGenerateAiVideo, useAiImages, useMediaAssets } from '@/features/media-library/hooks';
import {
  FAL_VIDEO_PROVIDERS,
  getFalVideoProviderById,
  DEFAULT_VIDEO_PROVIDER,
  type FalVideoProvider,
} from '@/lib/integrations/fal/fal-video-providers';

// ─── Constants ──────────────────────────────────────────────

// Duration options are now driven by provider.allowedDurations

type ModalStep = 'source' | 'configure';

// ─── Types ──────────────────────────────────────────────────

interface SourceImage {
  url: string;
  name: string;
  thumbnailUrl?: string;
}

interface GenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

/** Modal for generating AI videos via fal.ai — supports text-to-video and image-to-video. */
export function GenerateVideoModal({ isOpen, onClose }: GenerateVideoModalProps) {
  const generateVideo = useGenerateAiVideo();

  // Source image browsing
  const { data: aiImages } = useAiImages();
  const { data: mediaAssets } = useMediaAssets({ mediaType: 'IMAGE' });

  // ─── State ──────────────────────────────────────────────
  const [step, setStep] = useState<ModalStep>('source');
  const [provider, setProvider] = useState<string>(DEFAULT_VIDEO_PROVIDER);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(6);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  const selectedProvider = useMemo(
    () => getFalVideoProviderById(provider),
    [provider],
  );

  // Clamp duration to provider's allowed values
  const allowedDurations = useMemo(
    () => selectedProvider?.allowedDurations ?? [6, 8, 10],
    [selectedProvider],
  );

  useEffect(() => {
    if (!allowedDurations.includes(duration)) {
      setDuration(allowedDurations[0] ?? 6);
    }
  }, [allowedDurations, duration]);

  // Clamp aspect ratio to provider's supported list
  useEffect(() => {
    if (selectedProvider && !selectedProvider.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(selectedProvider.aspectRatios[0] ?? '16:9');
    }
  }, [selectedProvider, aspectRatio]);

  // Merge AI images + media library images for the picker
  const availableImages = useMemo(() => {
    const images: SourceImage[] = [];
    if (aiImages) {
      for (const img of aiImages) {
        if (img.fileUrl) {
          images.push({ url: img.fileUrl, name: img.name, thumbnailUrl: img.fileUrl });
        }
      }
    }
    if (mediaAssets?.assets) {
      for (const asset of mediaAssets.assets) {
        if (asset.fileUrl && asset.mediaType === 'IMAGE') {
          images.push({
            url: asset.fileUrl,
            name: asset.name ?? asset.fileName ?? 'Media asset',
            thumbnailUrl: asset.thumbnailUrl ?? asset.fileUrl,
          });
        }
      }
    }
    return images;
  }, [aiImages, mediaAssets]);

  // ─── Handlers ───────────────────────────────────────────

  const resetForm = useCallback(() => {
    setStep('source');
    setProvider(DEFAULT_VIDEO_PROVIDER);
    setName('');
    setPrompt('');
    setDuration(6);
    setAspectRatio('16:9');
    setSourceImage(null);
    setImagePickerOpen(false);
    generateVideo.reset();
  }, [generateVideo]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleGenerate = () => {
    generateVideo.mutate(
      {
        name: name.trim(),
        prompt: prompt.trim(),
        provider,
        duration,
        aspectRatio,
        ...(sourceImage ? { sourceImageUrl: sourceImage.url } : {}),
      },
      { onSuccess: handleClose },
    );
  };

  const isValid = name.trim().length > 0 && prompt.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate AI Video" size="lg">
      <div className="space-y-5">

        {/* ── Step 1: Choose source (text-only or image-to-video) ── */}
        {step === 'source' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">How would you like to create your video?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSourceImage(null);
                  setStep('configure');
                }}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">Text to Video</span>
                </div>
                <p className="text-sm text-gray-500">Generate a video from a text prompt only.</p>
              </button>

              <button
                type="button"
                onClick={() => setImagePickerOpen(true)}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50/50 text-left transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Image className="w-5 h-5 text-teal-600" />
                  <span className="font-semibold text-gray-900">Image to Video</span>
                </div>
                <p className="text-sm text-gray-500">Animate a photo from your Media Library.</p>
              </button>
            </div>

            {/* Image picker inline */}
            {imagePickerOpen && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Select a source image</h4>
                  <button
                    type="button"
                    onClick={() => setImagePickerOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {availableImages.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    No images found. Upload images to your Media Library or generate AI images first.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableImages.map((img, i) => (
                      <button
                        key={`${img.url}-${i}`}
                        type="button"
                        onClick={() => {
                          setSourceImage(img);
                          setImagePickerOpen(false);
                          setStep('configure');
                        }}
                        className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-teal-400 transition-all group relative"
                      >
                        <img
                          src={img.thumbnailUrl ?? img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Configure + Generate ── */}
        {step === 'configure' && (
          <>
            <button
              type="button"
              onClick={() => setStep('source')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Back
            </button>

            {/* Source image preview */}
            {sourceImage && (
              <div className="flex items-center gap-3 rounded-lg bg-teal-50 border border-teal-100 p-3">
                <img
                  src={sourceImage.thumbnailUrl ?? sourceImage.url}
                  alt={sourceImage.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-teal-900 truncate">{sourceImage.name}</p>
                  <p className="text-xs text-teal-600">Image-to-video — this image will be animated</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSourceImage(null);
                    setStep('source');
                  }}
                  className="p-1 text-teal-400 hover:text-teal-600 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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
                placeholder={
                  sourceImage
                    ? 'Describe how this image should be animated...'
                    : 'Describe the video you want to generate...'
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{prompt.length}/1000</p>
            </div>

            {/* Provider grid */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">AI Video Model</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Choose a model based on quality, speed, and budget.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FAL_VIDEO_PROVIDERS.map((p) => {
                  const isSelected = provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <Video className="w-4 h-4" style={{ color: isSelected ? '#0d9488' : '#6b7280' }} />
                        <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                        <span>{p.cost}</span>
                        <span>·</span>
                        <span>max {p.maxDuration}s</span>
                        {p.supportsAudio && (
                          <>
                            <span>·</span>
                            <span>audio</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration + Aspect Ratio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <div className="flex gap-2">
                  {allowedDurations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        duration === d
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                      style={duration === d ? { backgroundColor: '#0d9488' } : undefined}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {(selectedProvider?.aspectRatios ?? ['16:9', '9:16']).map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generation progress */}
            {generateVideo.isPending && (
              <div className="flex items-center gap-2 rounded-lg border p-3" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#0d9488' }} />
                <p className="text-sm" style={{ color: '#065f46' }}>
                  Generating video... This may take 30–180 seconds depending on duration and model.
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
          </>
        )}
      </div>
    </Modal>
  );
}
