"use client";

import { useState, useEffect } from "react";
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

const STEPS: { status: ConsistentModelStatus; label: string }[] = [
  { status: "UPLOADING", label: "Uploading reference images" },
  { status: "TRAINING", label: "Fine-tuning AI model" },
  { status: "READY", label: "Generating samples" },
];

/** Real-time training status modal with polling */
export function TrainingProgressModal({
  isOpen,
  onClose,
  modelId,
  modelName,
  onComplete,
}: TrainingProgressModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isTraining = isOpen;
  const { data: status } = useTrainingStatus(modelId, isTraining);

  const currentStatus = status?.status ?? "UPLOADING";
  const isComplete = currentStatus === "READY";
  const isFailed = currentStatus === "TRAINING_FAILED";

  // Elapsed time counter
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

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
    // Use real Replicate progress when training, scaled to the training step range (33-66%)
    if (currentStatus === "TRAINING" && status?.progress != null) {
      return 33 + (status.progress / 100) * 34;
    }
    const idx = STEPS.findIndex((s) => s.status === currentStatus);
    return Math.max(10, ((idx + 0.5) / STEPS.length) * 100);
  };

  // Prevent closing while training is in progress
  const isActive = !isComplete && !isFailed;
  const handleClose = isActive ? () => {} : onClose;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Training: ${modelName}`}
      size="md"
      showCloseButton={!isActive}
    >
      <div className="space-y-6 py-2">
        <ProgressBar value={getStepProgress()} color="teal" size="md" />

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
          <span>Elapsed: {formatTime(elapsedSeconds)}</span>
        </div>

        {/* Error state */}
        {isFailed && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Training failed</p>
              <p className="mt-1 text-red-600">
                {status?.trainingError ?? "An unexpected error occurred. Please try again."}
              </p>
            </div>
          </div>
        )}

        {/* Success state */}
        {isComplete && status?.sampleImageUrls?.length ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-emerald-700">
              Training complete! Here are your sample images:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {status.sampleImageUrls.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  <img
                    src={url}
                    alt={`Sample ${i + 1}`}
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
              Close
            </Button>
          )}
          {isComplete && (
            <Button variant="primary" onClick={onClose}>
              View Model
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
