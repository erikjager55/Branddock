"use client";

import { useState } from "react";
import { Zap, Settings } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { TRAINING_DEFAULTS } from "../../constants/model-constants";
import { SampleGallery } from "./SampleGallery";
import type { ConsistentModelDetail } from "../../types/consistent-model.types";

interface TrainingSectionProps {
  model: ConsistentModelDetail;
  onStartTraining: (config: { steps: number; resolution: number }) => void;
  isStarting: boolean;
}

/** Training configuration + start + sample gallery */
export function TrainingSection({
  model,
  onStartTraining,
  isStarting,
}: TrainingSectionProps) {
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

      {model.status === "READY" && model.sampleImageUrls?.length ? (
        <SampleGallery urls={model.sampleImageUrls} />
      ) : null}

      <Card className="p-5">
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
              <span>{TRAINING_DEFAULTS.minSteps}</span>
              <span>{TRAINING_DEFAULTS.maxSteps}</span>
            </div>
          </div>

          {/* Resolution selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Resolution
            </label>
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
      </Card>
    </div>
  );
}
