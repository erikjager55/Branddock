// =============================================================
// Training Poller — Fallback for webhook-less environments
//
// Polls Replicate API to check if a training has finished.
// Used during development or when webhooks are unreachable.
// =============================================================

import { prisma } from '@/lib/prisma';
import { getReplicateTraining } from '@/lib/integrations/replicate/replicate-client';
import { handleTrainingComplete } from './training-pipeline';

export interface PollResult {
  modelId: string;
  status: string;
  changed: boolean;
  error?: string;
}

/** Poll Replicate for the current training status of a model */
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

  if (!model.replicateTrainingId) {
    throw new Error('Model has no Replicate training ID');
  }

  try {
    const training = await getReplicateTraining(model.replicateTrainingId);

    // Training succeeded
    if (training.status === 'succeeded') {
      const result = await handleTrainingComplete(
        model.replicateTrainingId,
        true,
        undefined,
        training.version ?? undefined
      );
      return {
        modelId: model.id,
        status: 'READY',
        changed: true,
        error: result.error,
      };
    }

    // Training failed or canceled
    if (training.status === 'failed' || training.status === 'canceled') {
      const errorMessage = training.error ?? `Training ${training.status}`;
      await handleTrainingComplete(
        model.replicateTrainingId,
        false,
        errorMessage
      );
      return {
        modelId: model.id,
        status: 'TRAINING_FAILED',
        changed: true,
        error: errorMessage,
      };
    }

    // Still training (starting or processing) — no change
    return {
      modelId: model.id,
      status: 'TRAINING',
      changed: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If Replicate returns a 404, the training was likely deleted
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      await handleTrainingComplete(
        model.replicateTrainingId,
        false,
        'Replicate training not found — it may have been deleted or expired.'
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
