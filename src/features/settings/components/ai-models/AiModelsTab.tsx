'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, RotateCcw, Check, Loader2 } from 'lucide-react';
import type { AIModelOption } from '@/lib/ai/exploration/config.types';
import type { AiFeatureDefinition, AiProvider } from '@/lib/ai/feature-models';
import { FEATURE_CATEGORIES } from '@/lib/ai/feature-models';

// ─── Types ─────────────────────────────────────────────────

interface FeatureConfig {
  key: string;
  label: string;
  description: string;
  category: AiFeatureDefinition['category'];
  supportedProviders: AiProvider[];
  defaultProvider: AiProvider;
  defaultModel: string;
  provider: string;
  model: string;
  isCustomized: boolean;
}

interface AiModelsResponse {
  features: FeatureConfig[];
  availableModels: AIModelOption[];
}

// ─── Data Fetching ────────────────────────────────────────────

const aiModelsKeys = {
  all: ['ai-models'] as const,
};

async function fetchAiModels(): Promise<AiModelsResponse> {
  const res = await fetch('/api/settings/ai-models');
  if (!res.ok) throw new Error('Failed to fetch AI models');
  return res.json();
}

async function updateFeatureModel(body: { featureKey: string; provider: string; model: string }) {
  const res = await fetch('/api/settings/ai-models', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

// ─── Component ────────────────────────────────────────────────

export function AiModelsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: aiModelsKeys.all,
    queryFn: fetchAiModels,
  });

  const mutation = useMutation({
    mutationFn: updateFeatureModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiModelsKeys.all });
    },
  });

  const [savedKey, setSavedKey] = useState<string | null>(null);

  const handleChange = useCallback(
    (featureKey: string, provider: string, model: string) => {
      mutation.mutate({ featureKey, provider, model }, {
        onSuccess: () => {
          setSavedKey(featureKey);
          setTimeout(() => setSavedKey(null), 2000);
        },
      });
    },
    [mutation],
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading AI model settings...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-red-500 text-sm">
        Failed to load AI model settings. Please try again.
      </div>
    );
  }

  const { features, availableModels } = data;

  // Group features by category
  const grouped = new Map<AiFeatureDefinition['category'], FeatureConfig[]>();
  for (const feature of features) {
    const list = grouped.get(feature.category) ?? [];
    list.push(feature);
    grouped.set(feature.category, list);
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-gray-900">AI Models</h2>
        </div>
        <p className="text-sm text-gray-500">
          Choose which AI model to use for each feature. Changes take effect immediately.
        </p>
      </div>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([category, categoryFeatures]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              {FEATURE_CATEGORIES[category]}
            </h3>
            <div className="space-y-3">
              {categoryFeatures.map((feature) => (
                <FeatureRow
                  key={feature.key}
                  feature={feature}
                  availableModels={availableModels}
                  isSaving={mutation.isPending && mutation.variables?.featureKey === feature.key}
                  isSaved={savedKey === feature.key}
                  onChange={handleChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Row ──────────────────────────────────────────────

interface FeatureRowProps {
  feature: FeatureConfig;
  availableModels: AIModelOption[];
  isSaving: boolean;
  isSaved: boolean;
  onChange: (featureKey: string, provider: string, model: string) => void;
}

function FeatureRow({ feature, availableModels, isSaving, isSaved, onChange }: FeatureRowProps) {
  // Filter models to only show supported providers
  const supportedModels = availableModels.filter((m) =>
    feature.supportedProviders.includes(m.provider as AiProvider),
  );

  const handleModelChange = (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model) {
      onChange(feature.key, model.provider, model.id);
    }
  };

  const handleReset = () => {
    onChange(feature.key, feature.defaultProvider, feature.defaultModel);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{feature.label}</span>
          {feature.isCustomized && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
              Custom
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <select
          value={feature.model}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={isSaving}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 min-w-[200px]"
        >
          {/* Group by provider */}
          {feature.supportedProviders.map((provider) => {
            const providerModels = supportedModels.filter((m) => m.provider === provider);
            if (providerModels.length === 0) return null;
            const providerLabel = provider === 'anthropic' ? 'Anthropic' : provider === 'openai' ? 'OpenAI' : 'Google';
            return (
              <optgroup key={provider} label={providerLabel}>
                {providerModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        {feature.isCustomized && (
          <button
            onClick={handleReset}
            disabled={isSaving}
            title="Reset to default"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Status indicator */}
        <div className="w-5 h-5 flex items-center justify-center">
          {isSaving && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          {isSaved && <Check className="w-4 h-4 text-emerald-500" />}
        </div>
      </div>
    </div>
  );
}
