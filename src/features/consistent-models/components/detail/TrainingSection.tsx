"use client";

import { useState } from "react";
import { Zap, Settings, Cpu, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { TRAINING_DEFAULTS, FAL_MODEL_CONFIG } from "../../constants/model-constants";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import { SampleGallery } from "./SampleGallery";
import type { ConsistentModelDetail } from "../../types/consistent-model.types";

interface TrainingSectionProps {
  model: ConsistentModelDetail;
  onStartTraining: (config: { steps: number; resolution: number }) => void;
  isStarting: boolean;
  onViewShowcase?: () => void;
}

/** Training configuration + start + sample gallery */
export function TrainingSection({
  model,
  onStartTraining,
  isStarting,
  onViewShowcase,
}: TrainingSectionProps) {
  const { nextWizardStep } = useConsistentModelStore();
  const [steps, setSteps] = useState(
    model.trainingConfig?.steps ?? TRAINING_DEFAULTS.steps,
  );
  const [resolution, setResolution] = useState(
    model.trainingConfig?.resolution ?? TRAINING_DEFAULTS.defaultResolution,
  );

  const imageCount = model.referenceImages.length;
  const canTrain =
    imageCount >= TRAINING_DEFAULTS.minReferenceImages &&
    model.status !== "TRAINING" &&
    model.status !== "UPLOADING";

  const handleStart = () => {
    onStartTraining({ steps, resolution });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Training</h2>

      {/* Training complete banner */}
      {model.status === "READY" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Training complete</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Your model is ready. Continue to the showcase to generate images.
              </p>
            </div>
            <Button variant="primary" onClick={onViewShowcase ?? nextWizardStep}>
              View Showcase
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {model.sampleImageUrls?.length ? (
            <div className="mt-4">
              <SampleGallery urls={model.sampleImageUrls} />
            </div>
          ) : null}
        </div>
      )}

      {/* Training config — only show when not yet trained */}
      {model.status !== "READY" && <Card className="p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Settings className="h-4 w-4" />
            Training Configuration
          </div>

          {/* Steps slider */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <label className="font-medium text-gray-700">
                Training Steps
              </label>
              <span className="text-gray-500">{steps}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              More steps improve accuracy but take longer. 500 is a good balance for most models. Use fewer for quick tests, more for high-fidelity results.
            </p>
            <input
              type="range"
              min={TRAINING_DEFAULTS.minSteps}
              max={TRAINING_DEFAULTS.maxSteps}
              step={50}
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="mt-1 w-full accent-teal-600"
            />
            <div className="mt-0.5 flex justify-between text-xs text-gray-400">
              <span>{TRAINING_DEFAULTS.minSteps} (faster)</span>
              <span>{TRAINING_DEFAULTS.maxSteps} (higher quality)</span>
            </div>
          </div>

          {/* Resolution selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Resolution
            </label>
            <p className="mb-1.5 text-xs text-gray-400">
              The output size of generated images. Higher resolution captures more detail but takes longer to generate.
            </p>
            <div className="flex gap-2">
              {TRAINING_DEFAULTS.supportedResolutions.map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    resolution === res
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {res}px
                </button>
              ))}
            </div>
          </div>

          {/* AI Model info */}
          <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <Cpu className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Training with <span className="font-medium text-gray-700">{FAL_MODEL_CONFIG[model.type].label}</span>
              {model.type === "PERSON" && " — optimized for face consistency"}
              {model.type !== "PERSON" && FAL_MODEL_CONFIG[model.type].trainer.includes("flux-2") && " — best photorealism & prompt adherence"}
            </span>
          </div>

          {/* Start training */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-gray-500">
              {imageCount < TRAINING_DEFAULTS.minReferenceImages ? (
                <span className="text-amber-600">
                  Need at least {TRAINING_DEFAULTS.minReferenceImages} reference
                  images ({imageCount} uploaded)
                </span>
              ) : (
                <span>{imageCount} reference images ready</span>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={!canTrain}
              isLoading={isStarting}
            >
              <Zap className="mr-1.5 h-4 w-4" />
              Start Training
            </Button>
          </div>
        </div>
      </Card>}
    </div>
  );
}
