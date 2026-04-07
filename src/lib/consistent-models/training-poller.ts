// =============================================================
// Training Poller — Polls fal.ai queue for training status
//
// Polls fal.ai API to check if a training has finished.
// Used by the training-status endpoint to report progress.
// =============================================================

import { prisma } from '@/lib/prisma';
import { getFalTrainingStatus, getFalTrainingResult } from '@/lib/integrations/fal/fal-client';
import { handleTrainingComplete } from './training-pipeline';

/** Parse training progress percentage from fal.ai training logs.
 * Logs contain lines like: `flux_train: 52%|█████▏ | 517/1000` */
function parseTrainingProgress(logs: string | null | undefined): number | undefined {
  if (!logs) return undefined;
  // Match the last occurrence of a percentage in the logs (e.g., "52%|")
  const matches = logs.match(/(\d+)%\|/g);
  if (!matches || matches.length === 0) return undefined;
  const lastMatch = matches[matches.length - 1];
  const pct = parseInt(lastMatch, 10);
  return isNaN(pct) ? undefined : Math.min(pct, 100);
}

export interface PollResult {
  modelId: string;
  status: string;
  changed: boolean;
  error?: string;
  /** Training progress percentage (0-100), parsed from fal.ai logs */
  progress?: number;
  /** Whether the job is still waiting in fal.ai's queue */
  inQueue?: boolean;
}

/** Poll fal.ai for the current training status of a model */
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

  if (!model.falRequestId) {
    throw new Error('Model has no fal.ai training request ID');
  }

  // Resolve the trainer endpoint from DB (stored during training start)
  const trainingConfig = (model.trainingConfig as Record<string, unknown>) ?? {};
  const trainerEndpoint = (trainingConfig.falTrainer as string) ?? undefined;

  try {
    const trainingStatus = await getFalTrainingStatus(model.falRequestId, trainerEndpoint);

    // Training succeeded
    if (trainingStatus.status === 'COMPLETED') {
      // Fetch the full result to get the LoRA weights URL
      let loraUrl: string | undefined;
      try {
        const trainingResult = await getFalTrainingResult(model.falRequestId, trainerEndpoint);
        loraUrl = trainingResult.loraUrl ?? undefined;
      } catch (resultError) {
        // Some completed trainings fail to return results (e.g. Unprocessable Entity)
        console.error('[training-poller] Failed to fetch training result:', resultError);
      }

      // Fire-and-forget: run sample generation in background so the poll returns immediately
      handleTrainingComplete(
        model.falRequestId,
        true,
        undefined,
        loraUrl
      ).catch((err) => {
        console.error('[training-poller] handleTrainingComplete failed:', err);
      });

      return {
        modelId: model.id,
        status: 'READY',
        changed: true,
      };
    }

    // Training failed
    if (trainingStatus.status === 'FAILED') {
      const errorMessage = trainingStatus.error ?? 'Training failed';
      await handleTrainingComplete(
        model.falRequestId,
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

    // Still training (IN_QUEUE or IN_PROGRESS) — extract progress from logs
    const progress = parseTrainingProgress(trainingStatus.logs);
    return {
      modelId: model.id,
      status: 'TRAINING',
      changed: false,
      progress,
      inQueue: trainingStatus.status === 'IN_QUEUE',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If fal.ai returns a 404, the training was likely deleted
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      await handleTrainingComplete(
        model.falRequestId,
        false,
        'fal.ai training not found — it may have been deleted or expired.'
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
