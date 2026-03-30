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
  useUploadReferenceImages,
  useDeleteReferenceImage,
  useStartTraining,
  useGenerateImage,
  useGenerations,
} from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import { TRAINING_DEFAULTS } from "../../constants/model-constants";

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
    updateModel.mutate({ name: model.name }); // placeholder — archive not yet in UpdateModelBody
  };

  const handleDelete = () => {
    // TODO: confirmation dialog
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
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            isUploading={uploadImages.isPending}
            isDeleting={deleteImage.isPending}
          />

          <TrainingSection
            model={model}
            onStartTraining={handleStartTraining}
            isStarting={startTraining.isPending}
          />

          {isReady && (
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
          <TrainingStatusCard model={model} />
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
      <TrainingProgressModal
        isOpen={isTrainingModalOpen}
        onClose={closeTrainingModal}
        modelId={modelId}
        modelName={model.name}
        onComplete={closeTrainingModal}
      />
    </div>
  );
}
