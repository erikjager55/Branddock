'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Sparkles, Image, X, ChevronRight, Loader2 } from 'lucide-react';
import { Modal, Button, Input } from '@/components/shared';
import { useOptimizeAiImage, useAiImages, useMediaAssets } from '@/features/media-library/hooks';
import {
  FAL_OPTIMIZE_PROVIDERS,
  OPTIMIZE_CATEGORIES,
  getFalOptimizeProviderById,
  DEFAULT_OPTIMIZE_PROVIDER,
} from '@/lib/integrations/fal/fal-optimize-providers';

interface SourceImage {
  url: string;
  name: string;
  thumbnailUrl?: string;
}

type ModalStep = 'pick-image' | 'pick-action' | 'confirm';

// ─── Types ──────────────────────────────────────────────────

interface OptimizeImageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function OptimizeImageModal({ isOpen, onClose }: OptimizeImageModalProps) {
  const optimizeImage = useOptimizeAiImage();

  const { data: aiImages } = useAiImages();
  const { data: mediaAssets } = useMediaAssets({ mediaType: 'IMAGE' });

  const [step, setStep] = useState<ModalStep>('pick-image');
  const [sourceImage, setSourceImage] = useState<SourceImage | null>(null);
  const [provider, setProvider] = useState<string>(DEFAULT_OPTIMIZE_PROVIDER);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');

  const selectedProvider = useMemo(
    () => getFalOptimizeProviderById(provider),
    [provider],
  );

  // Filter providers by selected category
  const filteredProviders = useMemo(
    () => selectedCategory
      ? FAL_OPTIMIZE_PROVIDERS.filter((p) => p.category === selectedCategory)
      : FAL_OPTIMIZE_PROVIDERS,
    [selectedCategory],
  );

  // If current provider is not in filtered list, select the first one
  useEffect(() => {
    if (!filteredProviders.some((p) => p.id === provider)) {
      const first = filteredProviders[0]?.id;
      if (first) setProvider(first);
    }
  }, [filteredProviders, provider]);

  // Merge AI images + media library images
  const availableImages = useMemo(() => {
    const images: SourceImage[] = [];
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
    if (aiImages) {
      for (const img of aiImages) {
        if (img.fileUrl) {
          images.push({ url: img.fileUrl, name: img.name, thumbnailUrl: img.fileUrl });
        }
      }
    }
    return images;
  }, [aiImages, mediaAssets]);

  const resetForm = useCallback(() => {
    setStep('pick-image');
    setSourceImage(null);
    setProvider(DEFAULT_OPTIMIZE_PROVIDER);
    setSelectedCategory(null);
    setName('');
    setPrompt('');
    optimizeImage.reset();
  }, [optimizeImage]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSelectImage = (img: SourceImage) => {
    setSourceImage(img);
    setName(`${img.name} — optimized`);
    setStep('pick-action');
  };

  const handleOptimize = () => {
    if (!sourceImage || !selectedProvider) return;
    optimizeImage.mutate(
      {
        name: name.trim(),
        sourceImageUrl: sourceImage.url,
        provider,
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
      },
      { onSuccess: handleClose },
    );
  };

  const isEditCategory = selectedProvider?.category === 'edit';
  const isValid = name.trim().length > 0 && sourceImage !== null && (!isEditCategory || prompt.trim().length > 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Optimize Image" size="lg">
      <div className="space-y-5">

        {/* ── Step 1: Pick source image ── */}
        {step === 'pick-image' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select an image from your Media Library to optimize.
            </p>

            {availableImages.length === 0 ? (
              <div className="text-center py-8">
                <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  No images found. Upload images to your Media Library first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                {availableImages.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    onClick={() => handleSelectImage(img)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-teal-400 transition-all group relative"
                  >
                    <img
                      src={img.thumbnailUrl ?? img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Pick optimization action ── */}
        {step === 'pick-action' && (
          <>
            <button
              type="button"
              onClick={() => setStep('pick-image')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Change image
            </button>

            {/* Source image preview */}
            {sourceImage && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                <img
                  src={sourceImage.thumbnailUrl ?? sourceImage.url}
                  alt={sourceImage.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{sourceImage.name}</p>
                  <p className="text-xs text-gray-500">Source image</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSourceImage(null); setStep('pick-image'); }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Name */}
            <Input
              label="Output name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 200))}
              placeholder="e.g. Hero image — upscaled 4x"
            />

            {/* Provider section: category filter pills + flat provider grid */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">AI Optimization Model</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Pick a category to narrow the list, then choose a model.
              </p>

              {/* Category filter pills */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedCategory === null
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All models
                </button>
                {OPTIMIZE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                      selectedCategory === cat.key
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    title={cat.description}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Provider grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredProviders.map((p) => {
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
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                        <span className="text-xs text-gray-400">{p.cost}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                      <span className="mt-1 inline-block text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {p.categoryLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt field — required for edit category, optional for creative/clarity upscaler */}
            {selectedProvider && (() => {
              const isEdit = selectedProvider.category === 'edit';
              const supportsPrompt = isEdit || selectedProvider.id === 'creative-upscaler' || selectedProvider.id === 'clarity-upscaler';
              if (!supportsPrompt) return null;
              return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEdit ? 'What should change?' : (
                      <>Enhancement prompt <span className="text-gray-400 font-normal">(optional)</span></>
                    )}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                    placeholder={
                      isEdit
                        ? 'e.g. "Change the background to a modern office", "Make the lighting warmer", "Add a subtle gradient overlay"...'
                        : 'Describe what to enhance or add detail to...'
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{prompt.length}/1000</p>
                </div>
              );
            })()}

            {/* Progress */}
            {optimizeImage.isPending && (
              <div className="flex items-center gap-2 rounded-lg border p-3" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#0d9488' }} />
                <p className="text-sm" style={{ color: '#065f46' }}>
                  Optimizing image... This may take 10–30 seconds.
                </p>
              </div>
            )}

            {/* Error */}
            {optimizeImage.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3" role="alert">
                <p className="text-sm text-red-700">
                  {(optimizeImage.error as Error)?.message || 'Failed to optimize image.'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleClose} disabled={optimizeImage.isPending}>
                Cancel
              </Button>
              <Button
                icon={Sparkles}
                onClick={handleOptimize}
                disabled={!isValid || optimizeImage.isPending}
                isLoading={optimizeImage.isPending}
              >
                {optimizeImage.isPending ? 'Optimizing...' : 'Optimize Image'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
