'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Wand2, Cpu, ChevronDown, ChevronRight, Star, Check } from 'lucide-react';
import { Modal, Button, Input, Badge } from '@/components/shared';
import { useGenerateAiImage } from '@/features/media-library/hooks';
import {
  IMAGE_KIND_OPTIONS,
  IMAGE_PURPOSE_OPTIONS,
  IMAGE_STYLE_OPTIONS,
  PROVIDER_REGISTRY,
  recommendProviders,
} from '@/features/media-library/lib/recommend-provider';
import type { ImageProvider } from '@/features/media-library/types/media.types';
import type {
  ImageKind,
  ImagePurpose,
  ImageStyle,
  GenerationProvider,
  ProviderRecommendation,
} from '@/features/media-library/lib/recommend-provider';

// ─── Constants ──────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
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

type ModalMode = 'choose' | 'trained' | 'generate';

// ─── Types ──────────────────────────────────────────────────

export interface TrainedModelOption {
  id: string;
  name: string;
  triggerWord: string;
  type: string;
}

interface GenerateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedModel?: TrainedModelOption | null;
  preselectedModelId?: string | null;
  trainedModels?: TrainedModelOption[];
}

// ─── Sub-components ─────────────────────────────────────────

function QuestionRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; description: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              value === opt.value
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
            title={opt.description}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecommendedProviderCard({
  rec,
  isSelected,
  isTop,
  onSelect,
}: {
  rec: ProviderRecommendation;
  isSelected: boolean;
  isTop: boolean;
  onSelect: () => void;
}) {
  const meta = PROVIDER_REGISTRY[rec.provider as GenerationProvider];
  if (!meta) return null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`p-3 rounded-lg border-2 text-left transition-all w-full ${
        isSelected
          ? `${meta.border} ${meta.bg}`
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-sm font-semibold text-gray-900`}>{meta.label}</span>
        {isTop && <Badge variant="teal" className="ml-auto">Recommended</Badge>}
      </div>
      <p className="text-xs text-gray-500">{rec.reason}</p>
    </button>
  );
}

function AllProvidersGrid({
  selectedProvider,
  onSelect,
}: {
  selectedProvider: ImageProvider;
  onSelect: (p: ImageProvider) => void;
}) {
  const providers = Object.values(PROVIDER_REGISTRY);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {providers.map((meta) => (
        <button
          key={meta.id}
          type="button"
          onClick={() => onSelect(meta.id)}
          className={`p-2.5 rounded-lg border-2 text-left transition-all ${
            selectedProvider === meta.id
              ? `${meta.border} ${meta.bg}`
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <span className="text-sm font-semibold text-gray-900 block">{meta.label}</span>
          <p className="text-xs text-gray-500 mt-0.5">{meta.subtitle}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function GenerateImageModal({
  isOpen,
  onClose,
  preselectedModel,
  preselectedModelId,
  trainedModels = [],
}: GenerateImageModalProps) {
  const generateImage = useGenerateAiImage();

  const hasPreselection = !!(preselectedModel || preselectedModelId);
  const hasTrainedModels = trainedModels.length > 0 || !!preselectedModel;

  // Modal mode: choose (initial), trained, or generate
  const [mode, setMode] = useState<ModalMode>(hasPreselection ? 'trained' : 'choose');

  // Questionnaire state
  const [imageKind, setImageKind] = useState<ImageKind | null>(null);
  const [purpose, setPurpose] = useState<ImagePurpose | null>(null);
  const [style, setStyle] = useState<ImageStyle | null>(null);
  const [showManualOverride, setShowManualOverride] = useState(false);

  // Provider state
  const [provider, setProvider] = useState<ImageProvider>(
    hasPreselection ? 'TRAINED_MODEL' : 'IMAGEN',
  );
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  // Single model (legacy preselect) and multi-select
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    preselectedModel?.id ? [preselectedModel.id] : preselectedModelId ? [preselectedModelId] : [],
  );

  // Aspect ratio (shared across Imagen, Flux, Recraft, Ideogram, LoRA)
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // DALL-E options
  const [dalleSize, setDalleSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [dalleQuality, setDalleQuality] = useState<'standard' | 'hd'>('standard');
  const [dalleStyle, setDalleStyle] = useState<'vivid' | 'natural'>('vivid');

  const toggleModelId = useCallback((id: string) => {
    setSelectedModelIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }, []);

  // Sync preselection
  useEffect(() => {
    if (preselectedModel) {
      setMode('trained');
      setProvider('TRAINED_MODEL');
      setSelectedModelIds([preselectedModel.id]);
    } else if (preselectedModelId) {
      setMode('trained');
      setProvider('TRAINED_MODEL');
      setSelectedModelIds([preselectedModelId]);
    }
  }, [preselectedModel, preselectedModelId]);

  // Compute recommendations
  const allAnswered = imageKind !== null && purpose !== null && style !== null;
  const recommendations = useMemo<ProviderRecommendation[]>(() => {
    if (!allAnswered) return [];
    return recommendProviders({ imageKind: imageKind!, purpose: purpose!, style: style! });
  }, [imageKind, purpose, style, allAnswered]);

  // Auto-select top recommendation
  useEffect(() => {
    if (mode !== 'generate' || showManualOverride) return;
    if (recommendations.length > 0) {
      setProvider(recommendations[0].provider);
    }
  }, [recommendations, mode, showManualOverride]);

  const selectedModels = trainedModels.filter((m) => selectedModelIds.includes(m.id));
  // For single-model hint display
  const selectedModel = selectedModels[0] ?? preselectedModel ?? null;

  const resetForm = () => {
    setMode(hasPreselection ? 'trained' : 'choose');
    setProvider(hasPreselection ? 'TRAINED_MODEL' : 'IMAGEN');
    setName('');
    setPrompt('');
    setSelectedModelIds(preselectedModel?.id ? [preselectedModel.id] : preselectedModelId ? [preselectedModelId] : []);
    setAspectRatio('1:1');
    setDalleSize('1024x1024');
    setDalleQuality('standard');
    setDalleStyle('vivid');
    setImageKind(null);
    setPurpose(null);
    setStyle(null);
    setShowManualOverride(false);
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
        ...(provider === 'TRAINED_MODEL'
          ? {
              trainedModelIds: selectedModelIds,
              trainedModelId: selectedModelIds[0], // backward compat
              aspectRatio,
            }
          : provider === 'DALLE'
            ? { size: dalleSize, quality: dalleQuality, style: dalleStyle }
            : { aspectRatio }),
      },
      { onSuccess: handleClose },
    );
  };

  const isValid =
    name.trim().length > 0 &&
    prompt.trim().length > 0 &&
    (provider !== 'TRAINED_MODEL' || selectedModelIds.length > 0);

  const showDalleOptions = provider === 'DALLE';
  const showAspectRatio = !showDalleOptions && mode !== 'choose';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate AI Image" size="lg">
      <div className="space-y-5">

        {/* ── Step 1: Choose mode (trained model or generate) ── */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">What would you like to do?</p>
            <div className={`grid gap-3 ${hasTrainedModels ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {hasTrainedModels && (
                <button
                  type="button"
                  onClick={() => { setMode('trained'); setProvider('TRAINED_MODEL'); }}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50/50 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-gray-900">Use Trained Model</span>
                  </div>
                  <p className="text-sm text-gray-500">Generate with your fine-tuned brand model for consistent output.</p>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode('generate')}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">Generate Image</span>
                </div>
                <p className="text-sm text-gray-500">Create a new image — we&apos;ll recommend the best AI model for your use case.</p>
              </button>
            </div>
          </div>
        )}

        {/* ── Trained Model flow ── */}
        {mode === 'trained' && (
          <>
            {!hasPreselection && (
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                Back
              </button>
            )}

            {trainedModels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select models {trainedModels.length > 1 && <span className="text-gray-400 font-normal">(select up to 3 to combine)</span>}
                </label>
                <div className="space-y-2">
                  {trainedModels.map((m) => {
                    const isChecked = selectedModelIds.includes(m.id);
                    const isDisabled = !isChecked && selectedModelIds.length >= 3;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => toggleModelId(m.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                          isChecked
                            ? 'border-teal-500 bg-teal-50'
                            : isDisabled
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                          isChecked ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900">{m.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{m.type.toLowerCase()}</span>
                        </div>
                        <span className="ml-auto text-xs font-mono text-gray-400">{m.triggerWord}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedModels.length > 0 && (
              <div className="rounded-md bg-teal-50 border border-teal-100 px-3 py-2 text-xs text-teal-700">
                {selectedModels.length === 1 ? (
                  <>Trigger word <span className="font-mono font-semibold">{selectedModels[0].triggerWord}</span> will be automatically included in your prompt.</>
                ) : (
                  <>Combining <span className="font-semibold">{selectedModels.length} models</span> — trigger words <span className="font-mono font-semibold">{selectedModels.map((m) => m.triggerWord).join(', ')}</span> will be included. LoRA scales are automatically balanced.</>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Generate flow: questionnaire ── */}
        {mode === 'generate' && (
          <>
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              Back
            </button>

            <div className="space-y-3">
              <QuestionRow
                label="What kind of image?"
                options={IMAGE_KIND_OPTIONS}
                value={imageKind}
                onChange={setImageKind}
              />
              <QuestionRow
                label="What's it for?"
                options={IMAGE_PURPOSE_OPTIONS}
                value={purpose}
                onChange={setPurpose}
              />
              <QuestionRow
                label="What style?"
                options={IMAGE_STYLE_OPTIONS}
                value={style}
                onChange={setStyle}
              />
            </div>

            {/* Recommended providers */}
            {allAnswered && !showManualOverride && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Star className="w-3.5 h-3.5 inline-block mr-1 text-amber-500" />
                  Best fit for your image
                </label>
                <div className={`grid gap-3 ${recommendations.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {recommendations.map((rec, i) => (
                    <RecommendedProviderCard
                      key={rec.provider}
                      rec={rec}
                      isSelected={provider === rec.provider}
                      isTop={i === 0}
                      onSelect={() => setProvider(rec.provider)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualOverride(true)}
                  className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                  Choose a different model
                </button>
              </div>
            )}

            {/* Manual override: all providers */}
            {showManualOverride && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualOverride(false)}
                  className="flex items-center gap-1 mb-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  Back to recommendations
                </button>
                <label className="block text-sm font-medium text-gray-700 mb-2">All providers</label>
                <AllProvidersGrid selectedProvider={provider} onSelect={setProvider} />
              </div>
            )}
          </>
        )}

        {/* ── Name + Prompt + Options (visible in trained & generate modes) ── */}
        {mode !== 'choose' && (
          <>
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 200))}
              placeholder="e.g. Brand hero image"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                placeholder={
                  provider === 'TRAINED_MODEL' && selectedModel
                    ? `Describe what you want to generate with ${selectedModel.name}...`
                    : 'Describe the image you want to generate...'
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{prompt.length}/1000</p>
            </div>

            {/* Aspect ratio (all except DALL-E) */}
            {showAspectRatio && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar.value} value={ar.value}>{ar.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* DALL-E specific options */}
            {showDalleOptions && (
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
          </>
        )}
      </div>
    </Modal>
  );
}
