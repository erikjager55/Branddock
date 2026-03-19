// =============================================================
// Server-only resolver for per-feature AI model configuration.
// Imports Prisma — must NOT be imported from client components.
// =============================================================

import { prisma } from '@/lib/prisma';
import type { AiFeatureKey, AiProvider, ResolvedModel } from './feature-models';
import { getFeatureDefinition } from './feature-models';

/**
 * Resolve the AI model for a feature. Checks workspace config in DB first,
 * falls back to the feature's default.
 */
export async function resolveFeatureModel(
  workspaceId: string,
  featureKey: AiFeatureKey,
): Promise<ResolvedModel> {
  const featureDef = getFeatureDefinition(featureKey);
  if (!featureDef) {
    throw new Error(`Unknown AI feature key: "${featureKey}"`);
  }

  try {
    const config = await prisma.workspaceAiConfig.findUnique({
      where: { workspaceId_featureKey: { workspaceId, featureKey } },
    });

    if (config) {
      const configProvider = config.provider as AiProvider;
      if (featureDef.supportedProviders.includes(configProvider)) {
        return {
          provider: configProvider,
          model: config.model,
        };
      }
      console.error(
        `[resolveFeatureModel] Config for "${featureKey}" in workspace "${workspaceId}" has unsupported provider "${config.provider}" (allowed: ${featureDef.supportedProviders.join(', ')}); falling back to default`,
      );
    }
  } catch (error) {
    console.warn(`[resolveFeatureModel] DB lookup failed for "${featureKey}" in workspace "${workspaceId}":`, error);
  }

  return {
    provider: featureDef.defaultProvider,
    model: featureDef.defaultModel,
  };
}

/**
 * Assert that a resolved model uses the expected provider.
 * Defense-in-depth for features locked to a single SDK (Gemini, OpenAI).
 */
export function assertProvider(
  resolved: ResolvedModel,
  expected: AiProvider,
  featureKey: string,
): void {
  if (resolved.provider !== expected) {
    throw new Error(
      `Feature "${featureKey}" requires provider "${expected}" but resolved to "${resolved.provider}". Check AI model settings.`,
    );
  }
}
