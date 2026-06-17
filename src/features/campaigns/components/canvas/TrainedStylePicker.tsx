'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, X, AlertCircle, Cpu } from 'lucide-react';
import { useConsistentModels } from '@/features/consistent-models/hooks';
import { generateCanvasVisualTrained, setHeroImage as persistHeroImage } from '../../api/canvas.api';
import { canvasKeys } from '../../hooks/canvas.hooks';
import { useCanvasStore } from '../../stores/useCanvasStore';
import type { CanvasImageVariant } from '../../types/canvas.types';

interface TrainedStylePickerProps {
  deliverableId: string;
  onCancel?: () => void;
  /** Called after a successful generation — used by Step 2 to dismiss the picker. */
  onGenerated?: () => void;
  /** 'hero' in de LP-flow → de route wiret het getrainde beeld server-side in puckData.BrandHero. */
  target?: 'hero';
}

/**
 * Inline picker for selecting one of the workspace's trained ConsistentModels
 * (LoRA fine-tunes) + a style-strength slider, then triggering image
 * generation. Wired to Visual Brief source = 'trained-style'.
 *
 * The model + strength are persisted to settings.visualBrief.trained so they
 * survive Canvas reopen and feed forward to the generate-visual-trained
 * endpoint (which reads them server-side).
 */
export function TrainedStylePicker({ deliverableId, onCancel, onGenerated, target }: TrainedStylePickerProps) {
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const setVisualBriefField = useCanvasStore((s) => s.setVisualBriefField);
  const setImageVariants = useCanvasStore((s) => s.setImageVariants);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);
  const setVisualFidelityRunning = useCanvasStore((s) => s.setVisualFidelityRunning);
  const queryClient = useQueryClient();

  const initialTrained = visualBrief.trained;
  const [selectedModelId, setSelectedModelId] = useState<string | null>(initialTrained?.modelId ?? null);
  const [strength, setStrength] = useState<number>(initialTrained?.strength ?? 80);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only READY models can be used for generation. Status alone is enough —
  // the API only flips to READY once the LoRA URL is set; the server route
  // re-validates as a safety net.
  const { data, isLoading } = useConsistentModels({ status: 'READY' });
  const models = useMemo(() => data?.models ?? [], [data]);

  // Auto-select the first model when none picked yet.
  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // Persist selection to the Visual Brief so the endpoint can read it
  // server-side. The store flips `visualBriefModified` which schedules
  // the debounced PATCH; we also force-flush before generating.
  useEffect(() => {
    if (!selectedModelId) return;
    setVisualBriefField('trained', { modelId: selectedModelId, strength });
  }, [selectedModelId, strength, setVisualBriefField]);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const handleGenerate = async () => {
    if (!selectedModelId) return;
    setSubmitting(true);
    setError(null);
    try {
      // Force-flush the Visual Brief PATCH so the endpoint reads the
      // freshly-picked model + strength even when the 500ms debounce
      // hasn't fired yet.
      const flushResp = await fetch(`/api/studio/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            visualBrief: { ...visualBrief, source: 'trained-style', trained: { modelId: selectedModelId, strength } },
          },
        }),
      });
      // De source-persist IS de gate-garantie: faalt 'ie, dan zou generate met
      // een stale source 400'en met een misleidende melding. Surface 'm direct.
      if (!flushResp.ok) {
        throw new Error(`Could not save the Visual Brief (HTTP ${flushResp.status}) — please try again.`);
      }

      const result = await generateCanvasVisualTrained(deliverableId, target ? { target } : undefined);
      const mapped: CanvasImageVariant[] = result.variants.map((v, i) => ({
        index: i,
        url: v.url,
        prompt: v.prompt,
        isSelected: i === 0,
        componentId: v.id,
      }));
      setImageVariants(mapped);

      // G8 — show "Scoring…" badge immediately while the route's
      // background scoreImageFidelity calls run. Refetch in 20s to pick
      // up the persisted scores.
      const componentIds = result.variants
        .map((v) => v.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (componentIds.length > 0) {
        setVisualFidelityRunning(componentIds);
        setTimeout(() => {
          void queryClient.invalidateQueries({
            queryKey: canvasKeys.components(deliverableId),
          });
        }, 20_000);
      }

      // Auto-promote the first variant to hero image — same pattern as the
      // generate / library flows.
      const first = result.variants[0];
      if (first) {
        setHeroImage({ url: first.url, mediaAssetId: null });
        persistHeroImage(deliverableId, {
          imageUrl: first.url,
          imageSource: 'ai-generated',
          alt: null,
        }).catch((err) => {
          console.error('[TrainedStyle] hero image persist failed', err);
        });
      }
      onGenerated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate trained-style visual';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading trained models...
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <div className="rounded-full bg-gray-100 p-3">
          <Cpu className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 font-medium">No trained models available</p>
        <p className="text-xs text-gray-500 max-w-xs">
          Train a Consistent AI Model in the AI Trainer first, then return here to generate
          on-brand visuals using your trained style.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Model dropdown */}
      <div className="space-y-1.5">
        <label htmlFor="trained-model-select" className="block text-xs font-medium text-gray-700">
          Trained model
        </label>
        <select
          id="trained-model-select"
          value={selectedModelId ?? ''}
          onChange={(e) => setSelectedModelId(e.target.value)}
          disabled={submitting}
          className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.type ? `(${m.type.toLowerCase()})` : ''}
            </option>
          ))}
        </select>
        {selectedModel?.modelDescription && (
          <p className="text-[11px] text-gray-500">{selectedModel.modelDescription}</p>
        )}
      </div>

      {/* Strength slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="trained-strength" className="block text-xs font-medium text-gray-700">
            Style strength
          </label>
          <span className="text-xs font-mono text-gray-600">{strength}%</span>
        </div>
        <input
          id="trained-strength"
          type="range"
          min={20}
          max={150}
          step={5}
          value={strength}
          onChange={(e) => setStrength(parseInt(e.target.value, 10))}
          disabled={submitting}
          className="w-full accent-teal-600 disabled:opacity-50"
        />
        <p className="text-[11px] text-gray-500">
          Lower = more freedom for the model to interpret. Higher = locks tighter to the trained
          subject. <span className="font-medium">100%</span> is the recommended default for
          on-brand consistency.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!selectedModelId || submitting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-xs font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate visual
            </>
          )}
        </button>
      </div>
    </div>
  );
}
