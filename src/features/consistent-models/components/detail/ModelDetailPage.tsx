"use client";

import { useState } from "react";
import { ModelDetailHeader } from "./ModelDetailHeader";
import { ReferenceImagesSection } from "./ReferenceImagesSection";
import { TrainingSection } from "./TrainingSection";
import { TrainingProgressModal } from "./TrainingProgressModal";
import { GenerateSection } from "./GenerateSection";
import { ModelInfoCard } from "./sidebar/ModelInfoCard";
import { TrainingStatusCard } from "./sidebar/TrainingStatusCard";
import { QuickActionsCard } from "./sidebar/QuickActionsCard";
import {
  useConsistentModelDetail,
  useUpdateModel,
  useDeleteModel,
  useUploadReferenceImages,
  useDeleteReferenceImage,
  useStartTraining,
  useGenerateImage,
  useGenerations,
} from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import { TRAINING_DEFAULTS, TRAINABLE_TYPES } from "../../constants/model-constants";

interface ModelDetailPageProps {
  modelId: string;
  onNavigateBack: () => void;
}

/** Detail page orchestrator — 2-column layout (8/4 split) */
export function ModelDetailPage({
  modelId,
  onNavigateBack,
}: ModelDetailPageProps) {
  const { data: model, isLoading } = useConsistentModelDetail(modelId);
  const { data: generationsData } = useGenerations(modelId);
  const updateModel = useUpdateModel(modelId);
  const deleteModel = useDeleteModel(modelId);
  const uploadImages = useUploadReferenceImages(modelId);
  const deleteImage = useDeleteReferenceImage(modelId);
  const startTraining = useStartTraining(modelId);
  const generateImage = useGenerateImage(modelId);

  const {
    isTrainingModalOpen,
    openTrainingModal,
    closeTrainingModal,
  } = useConsistentModelStore();

  const [isGenerating, setIsGenerating] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid gap-6 md:grid-cols-12">
          <div className="space-y-6 md:col-span-8">
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          </div>
          <div className="space-y-4 md:col-span-4">
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!model) return null;

  const isReady = model.status === "READY";
  const isTrainable = TRAINABLE_TYPES.has(model.type);
  const generations = generationsData?.generations ?? [];

  const handleUpdateName = (name: string) => {
    updateModel.mutate({ name });
  };

  const handleUpload = (files: File[]) => {
    uploadImages.mutate(files);
  };

  const handleDeleteImage = (imageId: string) => {
    deleteImage.mutate(imageId);
  };

  const handleStartTraining = (config: {
    steps: number;
    resolution: number;
  }) => {
    startTraining.mutate(config, {
      onSuccess: () => {
        openTrainingModal();
      },
    });
  };

  const handleGenerate = (body: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    seed?: number;
  }) => {
    setIsGenerating(true);
    generateImage.mutate(body, {
      onSettled: () => {
        setIsGenerating(false);
      },
    });
  };

  const handleSetDefault = () => {
    updateModel.mutate({ isDefault: true });
  };

  const handleArchive = () => {
    const isArchived = model.status === "ARCHIVED";
    if (isArchived) {
      // Unarchive — set back to DRAFT (only ARCHIVED status is settable via PATCH)
      // For now, this is a no-op since unarchive isn't in the Zod schema
      return;
    }
    updateModel.mutate({ status: "ARCHIVED" as const });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${model.name}"? This will permanently remove the model, all reference images, and all generated images. This action cannot be undone.`
    );
    if (!confirmed) return;
    deleteModel.mutate(undefined, {
      onSuccess: () => {
        onNavigateBack();
      },
    });
  };

  const handleRetrain = () => {
    handleStartTraining({
      steps: TRAINING_DEFAULTS.steps,
      resolution: TRAINING_DEFAULTS.defaultResolution,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModelDetailHeader
        model={model}
        onBack={onNavigateBack}
        onUpdateName={handleUpdateName}
        isUpdating={updateModel.isPending}
      />

      {/* 2-column layout */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 md:col-span-8">
          <ReferenceImagesSection
            images={model.referenceImages}
            modelType={model.type}
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            isUploading={uploadImages.isPending}
            isDeleting={deleteImage.isPending}
          />

          {!isTrainable && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900">Style Guide Details</h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Model Name</label>
                <input
                  type="text"
                  value={model.modelName ?? ""}
                  onChange={(e) => updateModel.mutate({ modelName: e.target.value })}
                  placeholder="Style guide name..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Model Description</label>
                <textarea
                  value={model.modelDescription ?? ""}
                  onChange={(e) => updateModel.mutate({ modelDescription: e.target.value })}
                  placeholder="Describe this style guide..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Style Prompt</label>
                <textarea
                  value={model.stylePrompt ?? ""}
                  onChange={(e) => updateModel.mutate({ stylePrompt: e.target.value })}
                  placeholder="Style prompt for generation..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Negative Prompt</label>
                <textarea
                  value={model.negativePrompt ?? ""}
                  onChange={(e) => updateModel.mutate({ negativePrompt: e.target.value })}
                  placeholder="What to avoid..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              {model.type === "ANIMATION" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Generation Parameters <span className="font-normal text-gray-400">(JSON)</span>
                  </label>
                  <textarea
                    value={model.generationParams ? JSON.stringify(model.generationParams, null, 2) : ""}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateModel.mutate({ generationParams: parsed });
                      } catch {
                        // Don't update on invalid JSON
                      }
                    }}
                    placeholder='{"fps": 24, "duration": 5}'
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>
          )}

          {isTrainable && (
            <TrainingSection
              model={model}
              onStartTraining={handleStartTraining}
              isStarting={startTraining.isPending}
            />
          )}

          {isTrainable && isReady && (
            <GenerateSection
              model={model}
              generations={generations}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          )}
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-4 md:col-span-4">
          <ModelInfoCard model={model} />
          {isTrainable && <TrainingStatusCard model={model} />}
          <QuickActionsCard
            model={model}
            onGenerate={() => {
              const el = document.getElementById("generate-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            onRetrain={handleRetrain}
            onSetDefault={handleSetDefault}
            onArchive={handleArchive}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Training progress modal */}
      {isTrainable && (
        <TrainingProgressModal
          isOpen={isTrainingModalOpen}
          onClose={closeTrainingModal}
          modelId={modelId}
          modelName={model.name}
          onComplete={closeTrainingModal}
        />
      )}
    </div>
  );
}
