"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Modal, Button, ProgressBar } from "@/components/shared";
import { useTrainingStatus } from "../../hooks";
import type { ConsistentModelStatus } from "../../types/consistent-model.types";

interface TrainingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  modelName: string;
  onComplete: () => void;
}

/** Real-time training status modal with polling */
export function TrainingProgressModal({
  isOpen,
  onClose,
  modelId,
  modelName,
  onComplete,
}: TrainingProgressModalProps) {
  const { t } = useTranslation("consistent-models");
  const STEPS: { status: ConsistentModelStatus; label: string }[] = [
    { status: "UPLOADING", label: t("trainingModal.steps.UPLOADING") },
    { status: "TRAINING", label: t("trainingModal.steps.TRAINING") },
    { status: "READY", label: t("trainingModal.steps.READY") },
  ];
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isTraining = isOpen;
  const { data: status } = useTrainingStatus(modelId, isTraining);

  const currentStatus = status?.status ?? "UPLOADING";
  const isComplete = currentStatus === "READY";
  const isFailed = currentStatus === "TRAINING_FAILED";

  // Elapsed time — calculate from real trainingStartedAt timestamp
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      const startedAt = status?.trainingStartedAt;
      if (startedAt) {
        const started = new Date(startedAt).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
      }
    };

    tick(); // set immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen, status?.trainingStartedAt]);

  // Auto-close on completion
  useEffect(() => {
    if (isComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStepProgress = () => {
    if (isFailed) return 0;
    if (isComplete) return 100;
    // Use real fal.ai progress when training, scaled to the training step range (33-66%)
    if (currentStatus === "TRAINING" && status?.progress != null) {
      return 33 + (status.progress / 100) * 34;
    }
    const idx = STEPS.findIndex((s) => s.status === currentStatus);
    return Math.max(10, ((idx + 0.5) / STEPS.length) * 100);
  };

  const isActive = !isComplete && !isFailed;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("trainingModal.modalTitle", { name: modelName })}
      size="md"
      showCloseButton={true}
    >
      <div className="space-y-6 py-2">
        <div>
          <ProgressBar value={getStepProgress()} color="teal" size="md" showLabel={false} />
          {currentStatus === "TRAINING" && !isFailed && (
            <p className="mt-1.5 text-center text-sm font-medium text-teal-600">
              {status?.inQueue
                ? t("shared.waitingForGpu")
                : status?.progress != null
                  ? `${status.progress}%`
                  : t("shared.starting")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const stepIdx = STEPS.findIndex(
              (s) => s.status === currentStatus,
            );
            const isDone = isComplete || i < stepIdx;
            const isCurrent = !isComplete && !isFailed && i === stepIdx;

            return (
              <div key={step.status} className="flex items-center gap-3">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                )}
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-gray-500 line-through"
                      : isCurrent
                        ? "font-medium text-gray-900"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                  {isCurrent && step.status === "TRAINING" && status?.progress != null && (
                    <span className="ml-2 text-teal-600">{status.progress}%</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Elapsed time */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{t("trainingModal.elapsed", { time: formatTime(elapsedSeconds) })}</span>
        </div>

        {/* Background training info */}
        {isActive && (
          <p className="text-center text-xs text-gray-400">
            {t("trainingModal.backgroundInfo")}
          </p>
        )}

        {/* Error state */}
        {isFailed && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">{t("trainingModal.failedTitle")}</p>
              <p className="mt-1 text-red-600">
                {status?.trainingError ?? t("trainingModal.failedFallback")}
              </p>
            </div>
          </div>
        )}

        {/* Success state */}
        {isComplete && status?.sampleImageUrls?.length ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-emerald-700">
              {t("trainingModal.completeMessage")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {status.sampleImageUrls.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  <img
                    src={url}
                    alt={t("trainingModal.sampleAlt", { index: i + 1 })}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {isFailed && (
            <Button variant="secondary" onClick={onClose}>
              {t("trainingModal.close")}
            </Button>
          )}
          {isComplete && (
            <Button variant="primary" onClick={onClose}>
              {t("trainingModal.viewModel")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
