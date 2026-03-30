"use client";

import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, ProgressBar } from "@/components/shared";
import type { ConsistentModelDetail } from "../../../types/consistent-model.types";

interface TrainingStatusCardProps {
  model: ConsistentModelDetail;
}

/** Sidebar card with training status details */
export function TrainingStatusCard({ model }: TrainingStatusCardProps) {
  const isTraining = model.status === "TRAINING" || model.status === "UPLOADING";
  const isFailed = model.status === "TRAINING_FAILED";
  const isReady = model.status === "READY";

  if (model.status === "DRAFT") return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Training Status
      </h3>
      <div className="space-y-3">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {isTraining && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <span className="text-sm font-medium text-amber-700">
                Training in progress...
              </span>
            </>
          )}
          {isReady && (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">
                Training complete
              </span>
            </>
          )}
          {isFailed && (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">
                Training failed
              </span>
            </>
          )}
        </div>

        {isTraining && <ProgressBar value={50} color="amber" size="sm" />}

        {/* Timestamps */}
        <div className="space-y-2 text-sm">
          {model.trainingStartedAt && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Started</span>
              <span className="flex items-center gap-1 text-gray-700">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(model.trainingStartedAt)}
              </span>
            </div>
          )}
          {model.trainingCompletedAt && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Completed</span>
              <span className="text-gray-700">
                {formatDate(model.trainingCompletedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Training config */}
        {model.trainingConfig && (
          <div className="space-y-1.5 border-t border-gray-100 pt-3">
            <span className="text-xs font-medium text-gray-500">
              Configuration
            </span>
            <div className="flex flex-wrap gap-1.5">
              {model.trainingConfig.steps && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {model.trainingConfig.steps} steps
                </span>
              )}
              {model.trainingConfig.resolution && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {model.trainingConfig.resolution}px
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error details */}
        {isFailed && model.trainingError && (
          <div className="rounded-md bg-red-50 p-2 text-xs text-red-600">
            {model.trainingError}
          </div>
        )}
      </div>
    </Card>
  );
}
