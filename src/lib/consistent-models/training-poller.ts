// =============================================================
// Training Poller — Fallback for webhook-less environments
//
// Polls Astria API to check if a tune has finished training.
// Used during development or when webhooks are unreachable.
// =============================================================

import { prisma } from '@/lib/prisma';
import { getTune } from '@/lib/integrations/astria/astria-client';
import { handleTrainingComplete } from './training-pipeline';

export interface PollResult {
  modelId: string;
  status: string;
  changed: boolean;
  error?: string;
}

/** Poll Astria for the current training status of a model */
export async function pollTrainingStatus(
  modelId: string,
  workspaceId: string
): Promise<PollResult> {
  const model = await prisma.consistentModel.findFirst({
    where: { id: modelId, workspaceId },
  });

  if (!model) {
    throw new Error('Model not found');
  }

  if (model.status !== 'TRAINING') {
    return {
      modelId: model.id,
      status: model.status,
      changed: false,
    };
  }

  if (!model.astriaModelId) {
    throw new Error('Model has no Astria tune ID');
  }

  const tuneId = parseInt(model.astriaModelId, 10);

  try {
    const tune = await getTune(tuneId);

    // Training complete
    if (tune.trained_at) {
      const result = await handleTrainingComplete(
        model.astriaModelId,
        true
      );
      return {
        modelId: model.id,
        status: 'READY',
        changed: true,
        error: result.error,
      };
    }

    // Still training — no change
    return {
      modelId: model.id,
      status: 'TRAINING',
      changed: false,
    };
  } catch (error) {
    // If Astria returns an error, the tune likely failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Only mark as failed if the error indicates a real failure
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      await handleTrainingComplete(
        model.astriaModelId,
        false,
        'Astria tune not found — it may have been deleted or expired.'
      );
      return {
        modelId: model.id,
        status: 'TRAINING_FAILED',
        changed: true,
        error: errorMessage,
      };
    }

    // Transient error — don't change status
    return {
      modelId: model.id,
      status: 'TRAINING',
      changed: false,
      error: `Poll failed: ${errorMessage}`,
    };
  }
}
