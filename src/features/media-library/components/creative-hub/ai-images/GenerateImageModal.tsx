'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Wand2, Cpu, ChevronRight, Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Modal, Button, Input, ImageProviderGrid, BrandContextTagsEditor, StyleGuidelinesEditor } from '@/components/shared';
import { useGenerateAiImage, useWorkspaceBrandContext } from '@/features/media-library/hooks';
import {
  getFalProvidersByUsage,
  FAL_USAGE_LABELS,
  type FalUsageCategory,
} from '@/lib/integrations/fal/fal-providers';
import type { GeneratedImageWithMeta } from '@/features/media-library/types/media.types';

// ─── Constants ──────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
];

const USAGE_OPTIONS: { value: FalUsageCategory; label: string }[] = (
  Object.entries(FAL_USAGE_LABELS) as [FalUsageCategory, { label: string; description: string }][]
).map(([value, meta]) => ({ value, label: meta.label }));

/** Default fal.ai provider when no usage filter is active */
const DEFAULT_PROVIDER = 'fal-ai/flux-2-pro';

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
  /**
   * Optional callback fired AFTER a successful generation, BEFORE the
   * modal closes itself. Receives the freshly created GeneratedImage so
   * the caller can hand it off (e.g. send-to-library + link to a canvas
   * deliverable). When provided, the consumer is responsible for any
   * post-success UX.
   */
  onGenerated?: (image: GeneratedImageWithMeta) => void | Promise<void>;
  /** When provided, shows an "Optimize Image" option in the mode chooser. Closes this modal and calls the callback. */
  onOpenOptimize?: () => void;
}

// ─── Main Component ─────────────────────────────────────────

export function GenerateImageModal({
  isOpen,
  onClose,
  preselectedModel,
  preselectedModelId,
  trainedModels = [],
  onGenerated,
  onOpenOptimize,
}: GenerateImageModalProps) {
  const generateImage = useGenerateAiImage();
  const { data: brandContext, isLoading: isBrandContextLoading } = useWorkspaceBrandContext();

  const hasPreselection = !!(preselectedModel || preselectedModelId);
  const hasTrainedModels = trainedModels.length > 0 || !!preselectedModel;

  // Modal mode: choose (initial), trained, or generate
  const [mode, setMode] = useState<ModalMode>(hasPreselection ? 'trained' : 'choose');

  // ─── Generic generate state ──────────────────────────────

  // Provider state
  const [provider, setProvider] = useState<string>(DEFAULT_PROVIDER);

  // Smart filter — always visible above the provider grid, narrows the list.
  const [selectedUsage, setSelectedUsage] = useState<FalUsageCategory | null>(null);
  const filteredProviders = useMemo(
    () => getFalProvidersByUsage(selectedUsage),
    [selectedUsage],
  );

  // Brand context tag state — default: nothing selected, user opts in.
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [customTags, setCustomTags] = useState<string[]>([]);

  // When the questionnaire filter changes, re-pick the first provider if current is out of range.
  useEffect(() => {
    if (!filteredProviders.some((p) => p.id === provider)) {
      const first = filteredProviders[0]?.id;
      if (first) setProvider(first);
    }
  }, [filteredProviders, provider]);

  // Style guidelines
  const [dos, setDos] = useState('');
  const [donts, setDonts] = useState('');

  /**
   * Apply the workspace brand guidelines (photography direction, design
   * language, personality) to the prompt. Default ON — server-side resolved.
   */
  const [applyBrandGuidelines, setApplyBrandGuidelines] = useState(true);

  // ─── Trained model state ─────────────────────────────────

  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    preselectedModel?.id
      ? [preselectedModel.id]
      : preselectedModelId
        ? [preselectedModelId]
        : [],
  );

  // ─── Shared form state ───────────────────────────────────

  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');

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
      setSelectedModelIds([preselectedModel.id]);
    } else if (preselectedModelId) {
      setMode('trained');
      setSelectedModelIds([preselectedModelId]);
    }
  }, [preselectedModel, preselectedModelId]);

  const selectedModels = trainedModels.filter((m) => selectedModelIds.includes(m.id));
  const selectedModel = selectedModels[0] ?? preselectedModel ?? null;

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const addCustomTag = useCallback(
    (tag: string) => {
      const initial = brandContext?.tags ?? [];
      if (customTags.includes(tag) || initial.includes(tag)) return;
      setCustomTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => new Set([...prev, tag]));
    },
    [customTags, brandContext?.tags],
  );

  const resetForm = () => {
    setMode(hasPreselection ? 'trained' : 'choose');
    setProvider(DEFAULT_PROVIDER);
    setSelectedUsage(null);
    setSelectedTags(new Set());
    setCustomTags([]);
    setDos('');
    setDonts('');
    setApplyBrandGuidelines(true);
    setName('');
    setPrompt('');
    setSelectedModelIds(
      preselectedModel?.id
        ? [preselectedModel.id]
        : preselectedModelId
          ? [preselectedModelId]
          : [],
    );
    setAspectRatio('1:1');
    generateImage.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerate = () => {
    const isTrained = mode === 'trained';
    generateImage.mutate(
      {
        name: name.trim(),
        prompt: prompt.trim(),
        provider: isTrained ? 'TRAINED_MODEL' : provider,
        aspectRatio,
        ...(isTrained
          ? {
              trainedModelIds: selectedModelIds,
              trainedModelId: selectedModelIds[0],
            }
          : {
              brandTags: Array.from(selectedTags),
              applyBrandGuidelines,
              ...(dos.trim() ? { dos: dos.trim() } : {}),
              ...(donts.trim() ? { donts: donts.trim() } : {}),
            }),
      },
      {
        onSuccess: async (image) => {
          // If a consumer wants to do something with the result (e.g. the
          // canvas Insert Image flow which sends-to-library + links to
          // the deliverable), give it a chance before we reset/close.
          if (onGenerated) {
            try {
              await onGenerated(image);
            } catch (err) {
              console.error('[GenerateImageModal] onGenerated failed:', err);
            }
          }
          handleClose();
        },
      },
    );
  };

  const isValid =
    name.trim().length > 0 &&
    prompt.trim().length > 0 &&
    (mode !== 'trained' || selectedModelIds.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate AI Image" size="lg">
      <div className="space-y-5">

        {/* ── Step 1: Choose mode (trained model or generate) ── */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">What would you like to do?</p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {hasTrainedModels && (
                <button
                  type="button"
                  onClick={() => setMode('trained')}
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
                <p className="text-sm text-gray-500">Pick a fal.ai model, tune brand context, and generate.</p>
              </button>
              {onOpenOptimize && (
                <button
                  type="button"
                  onClick={() => { handleClose(); onOpenOptimize(); }}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-900">Optimize Image</span>
                  </div>
                  <p className="text-sm text-gray-500">Edit, upscale, enhance, or remove backgrounds from an existing image.</p>
                </button>
              )}
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

        {/* ── Generate flow: name+prompt → filter → provider → tags → guidelines ── */}
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

            {/* ── Name + Prompt (top of the form) ── */}
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
                placeholder="Describe the image you want to generate..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{prompt.length}/1000</p>
            </div>

            {/* ── Provider section (filter + grid) ── */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">AI Image Provider</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Pick a category to narrow the list, then choose a model.
              </p>

              {/* Filter pills — always visible */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUsage(null)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedUsage === null
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All providers
                </button>
                {USAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedUsage(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                      selectedUsage === opt.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    title={FAL_USAGE_LABELS[opt.value].description}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <ImageProviderGrid
                  providers={filteredProviders}
                  selectedId={provider}
                  onSelect={setProvider}
                />
              </div>
            </div>

            {/* ── Apply brand guidelines toggle ── */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyBrandGuidelines}
                  onChange={(e) => setApplyBrandGuidelines(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    Apply brand guidelines
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Automatically inject your photography direction, design language, and brand
                    personality from Brand Foundation into the prompt.
                  </p>
                </div>
              </label>
            </div>

            {/* ── Brand Context Tags ── */}
            <BrandContextTagsEditor
              initialTags={brandContext?.tags ?? []}
              customTags={customTags}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
              onAddCustomTag={addCustomTag}
              isLoading={isBrandContextLoading}
            />

            {/* ── Style Guidelines ── */}
            <StyleGuidelinesEditor
              dos={dos}
              donts={donts}
              onDosChange={setDos}
              onDontsChange={setDonts}
            />
          </>
        )}

        {/* ── Name + Prompt (trained mode only — generate mode renders them above) ── */}
        {mode === 'trained' && (
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
                  selectedModel
                    ? `Describe what you want to generate with ${selectedModel.name}...`
                    : 'Describe the image you want to generate...'
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{prompt.length}/1000</p>
            </div>
          </>
        )}

        {/* ── Aspect Ratio + Actions (shared by trained & generate) ── */}
        {mode !== 'choose' && (
          <>
            {/* Aspect ratio */}
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
