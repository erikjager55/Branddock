"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Cpu, Clock, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button, Card, ProgressBar } from "@/components/shared";
import { useTrainingStatus } from "../../hooks";
import { TRAINING_DEFAULTS, FAL_MODEL_CONFIG, TRAINING_STEPS_BY_TYPE } from "../../constants/model-constants";
import { SampleGallery } from "./SampleGallery";
import { GenerateSection } from "./GenerateSection";
import type { ConsistentModelDetail, GeneratedImageWithMeta } from "../../types/consistent-model.types";

interface TrainingSectionProps {
  model: ConsistentModelDetail;
  onStartTraining: (config: { steps: number; resolution: number }) => void;
  isStarting: boolean;
  onViewShowcase?: () => void;
  /** Auto-start training on mount when model is in DRAFT status */
  autoStart?: boolean;
  /** Showcase props — when provided, showcase is rendered inline */
  generations?: GeneratedImageWithMeta[];
  onGenerate?: (body: { prompt: string; negativePrompt?: string; width: number; height: number; seed?: number }) => void;
  isGenerating?: boolean;
}

/** Training + showcase combined step */
export function TrainingSection({
  model,
  onStartTraining,
  isStarting,
  onViewShowcase,
  autoStart,
  generations,
  onGenerate,
  isGenerating,
}: TrainingSectionProps) {
  const { t } = useTranslation("consistent-models");
  const autoStartedRef = useRef(false);

  const imageCount = model.referenceImages.filter((img) => img.isTrainingImage).length;
  const canTrain =
    imageCount >= TRAINING_DEFAULTS.minReferenceImages &&
    model.status !== "TRAINING" &&
    model.status !== "UPLOADING" &&
    model.status !== "READY";

  const defaultSteps = TRAINING_STEPS_BY_TYPE[model.type] ?? 500;
  const defaultResolution = TRAINING_DEFAULTS.defaultResolution;

  // Auto-start training when entering this step
  useEffect(() => {
    if (autoStart && canTrain && !autoStartedRef.current && !isStarting) {
      autoStartedRef.current = true;
      onStartTraining({ steps: defaultSteps, resolution: defaultResolution });
    }
  }, [autoStart, canTrain, isStarting, onStartTraining, defaultSteps, defaultResolution]);

  const isTraining = model.status === "TRAINING" || model.status === "UPLOADING" || isStarting;
  const isReady = model.status === "READY";
  const isFailed = model.status === "TRAINING_FAILED";

  const { data: pollData } = useTrainingStatus(model.id, isTraining);
  const progress = pollData?.progress ?? undefined;
  const inQueue = pollData?.inQueue ?? false;

  // Elapsed timer
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!isTraining || !model.trainingStartedAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - new Date(model.trainingStartedAt!).getTime()) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isTraining, model.trainingStartedAt]);

  return (
    <div className="space-y-6">
      {/* Training in progress */}
      {isTraining && (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {inQueue ? t("shared.waitingForGpu") : t("shared.trainingInProgress")}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {inQueue
                  ? t("training.queuedHint")
                  : t("training.trainingWith", {
                      model: FAL_MODEL_CONFIG[model.type].label,
                      steps: defaultSteps,
                    })}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <ProgressBar
              value={inQueue ? 0 : (progress ?? 0)}
              color="teal"
              size="md"
              showLabel={false}
            />
            <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
              <span>
                {inQueue
                  ? t("training.queuedShort")
                  : progress != null
                    ? t("shared.percentComplete", { progress })
                    : t("training.startingTraining")}
              </span>
              {elapsed && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {elapsed}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <Cpu className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {t("training.configSummary", {
                images: imageCount,
                steps: defaultSteps,
                resolution: defaultResolution,
              })}
            </span>
          </div>
        </Card>
      )}

      {/* Training failed */}
      {isFailed && (
        <Card className="border-red-200 bg-red-50 p-6">
          <h3 className="text-sm font-semibold text-red-800">{t("training.failedTitle")}</h3>
          <p className="mt-1 text-xs text-red-600">
            {t("training.failedBody")}
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={() => onStartTraining({ steps: defaultSteps, resolution: defaultResolution })}
              disabled={isStarting}
              isLoading={isStarting}
            >
              <Zap className="mr-1.5 h-4 w-4" />
              {t("training.retry")}
            </Button>
          </div>
        </Card>
      )}

      {/* Training complete */}
      {isReady && (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{t("training.completeTitle")}</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("training.completeBody")}
                </p>
              </div>
            </div>
            {model.sampleImageUrls?.length ? (
              <div className="mt-4">
                <SampleGallery urls={model.sampleImageUrls} />
              </div>
            ) : null}
          </div>

          {/* Inline showcase */}
          {onGenerate && (
            <GenerateSection
              model={model}
              generations={generations ?? []}
              onGenerate={onGenerate}
              isGenerating={isGenerating ?? false}
            />
          )}
        </>
      )}

      {/* Waiting state — not enough images */}
      {!isTraining && !isReady && !isFailed && !canTrain && (
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500">
            {t("training.notEnoughImages", {
              min: TRAINING_DEFAULTS.minReferenceImages,
              count: imageCount,
            })}
          </p>
        </Card>
      )}
    </div>
  );
}
