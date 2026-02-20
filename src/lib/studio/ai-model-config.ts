// =============================================================
// AI Model Configuration — per content type
// =============================================================

import type { ContentTab, AiModelOption } from '@/types/studio';

export const AI_MODELS: Record<ContentTab, AiModelOption[]> = {
  text: [
    { id: 'claude', name: 'Claude', provider: 'Anthropic', description: 'Best for nuanced, brand-aligned writing', costPerGeneration: 0.05 },
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', description: 'Strong general-purpose writing', costPerGeneration: 0.06 },
    { id: 'gemini', name: 'Gemini', provider: 'Google', description: 'Fast, good for shorter content', costPerGeneration: 0.03 },
  ],
  images: [
    { id: 'nanobanana', name: 'Nanobanana', provider: 'Nanobanana', description: 'Brand-consistent image generation', costPerGeneration: 0.10 },
    { id: 'gemini', name: 'Gemini', provider: 'Google', description: 'Versatile image generation', costPerGeneration: 0.08 },
  ],
  video: [
    { id: 'nanobanana', name: 'Nanobanana', provider: 'Nanobanana', description: 'Short-form video generation', costPerGeneration: 0.50 },
    { id: 'veo', name: 'Veo', provider: 'Google', description: 'High-quality video synthesis', costPerGeneration: 0.80 },
  ],
  carousel: [
    { id: 'nanobanana', name: 'Nanobanana', provider: 'Nanobanana', description: 'Multi-slide visual generation', costPerGeneration: 0.25 },
    { id: 'gemini', name: 'Gemini', provider: 'Google', description: 'Slide image + text generation', costPerGeneration: 0.20 },
  ],
};

export const DEFAULT_MODELS: Record<ContentTab, string> = {
  text: 'claude',
  images: 'nanobanana',
  video: 'nanobanana',
  carousel: 'nanobanana',
};

export function getModelsForTab(tab: ContentTab): AiModelOption[] {
  return AI_MODELS[tab];
}

export function getDefaultModel(tab: ContentTab): string {
  return DEFAULT_MODELS[tab];
}

export function getModelById(tab: ContentTab, modelId: string): AiModelOption | undefined {
  return AI_MODELS[tab].find((m) => m.id === modelId);
}
