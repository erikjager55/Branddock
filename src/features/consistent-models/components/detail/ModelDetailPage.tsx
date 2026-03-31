"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { Button } from "@/components/shared";
import { ModelDetailHeader } from "./ModelDetailHeader";
import { ModelWizardStepper } from "./ModelWizardStepper";
import { ReferenceImagesSection } from "./ReferenceImagesSection";
import { TrainingSection } from "./TrainingSection";
import { TrainingProgressModal } from "./TrainingProgressModal";
import { GenerateSection } from "./GenerateSection";
import { StyleGuideDetailsSection } from "./StyleGuideDetailsSection";
import { IllustrationStyleSection } from "./IllustrationStyleSection";
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
import {
  TRAINING_DEFAULTS,
  TRAINABLE_TYPES,
  WIZARD_STEPS_TRAINABLE,
  WIZARD_STEPS_NON_TRAINABLE,
  WIZARD_STEPS_ILLUSTRATION,
  ILLUSTRATION_STYLE_OPTIONS,
  MIN_IMAGES_BY_TYPE,
} from "../../constants/model-constants";
import type { IllustrationStyleParams } from "../../types/consistent-model.types";

interface ModelDetailPageProps {
  modelId: string;
  onNavigateBack: () => void;
}

/** Detail page orchestrator — 2-column layout (8/4 split) with wizard stepper */
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
    wizardStep,
    setWizardStep,
    nextWizardStep,
    prevWizardStep,
  } = useConsistentModelStore();

  const [isGenerating, setIsGenerating] = useState(false);

  if (isLoading) {
    return (
      <PageShell maxWidth="7xl">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 min-w-0 space-y-6">
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          </div>
          <div className="min-w-0">
            <div className="md:sticky md:top-6 space-y-4">
              <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!model) return null;

  const isReady = model.status === "READY";
  const isTrainable = TRAINABLE_TYPES.has(model.type);
  const generations = generationsData?.generations ?? [];
  const stepLabels = isTrainable
    ? WIZARD_STEPS_TRAINABLE
    : model.type === "ILLUSTRATION"
      ? WIZARD_STEPS_ILLUSTRATION
      : WIZARD_STEPS_NON_TRAINABLE;

  // ─── canProceed logic ────────────────────────────────────

  const canProceed = (() => {
    if (isTrainable) {
      if (wizardStep === 1) {
        return model.referenceImages.length >= MIN_IMAGES_BY_TYPE[model.type];
      }
      // Step 2 (Training): always true — training config is optional
      // Step 3 (Generate): no next button
      return true;
    }
    // Non-trainable: all steps allow proceeding (style guide & reference images are optional)
    return true;
  })();

  // ─── Handlers ─────────────────────────────────────────────

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
      onError: (error: Error) => {
        window.alert(`Training failed: ${error.message}`);
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

  // ─── Step content renderers ──────────────────────────────

  const renderTrainableStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <ReferenceImagesSection
            images={model.referenceImages}
            modelType={model.type}
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            isUploading={uploadImages.isPending}
            isDeleting={deleteImage.isPending}
          />
        );
      case 2:
        return (
          <TrainingSection
            model={model}
            onStartTraining={handleStartTraining}
            isStarting={startTraining.isPending}
          />
        );
      case 3:
        return isReady ? (
          <GenerateSection
            model={model}
            generations={generations}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Model is not ready yet. Complete training first to start generating images.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderNonTrainableStep = () => {
    switch (wizardStep) {
      case 1:
        return model.type === "ILLUSTRATION" ? (
          <IllustrationStyleSection
            model={model}
            updateModel={updateModel}
          />
        ) : (
          <StyleGuideDetailsSection
            model={model}
            updateModel={updateModel}
          />
        );
      case 2:
        return (
          <ReferenceImagesSection
            images={model.referenceImages}
            modelType={model.type}
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            isUploading={uploadImages.isPending}
            isDeleting={deleteImage.isPending}
          />
        );
      case 3: {
        const illustrationParams = model.type === "ILLUSTRATION"
          ? (model.generationParams as IllustrationStyleParams) ?? {}
          : null;

        return (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium text-gray-900">{model.modelName || model.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Type</span>
                <p className="font-medium text-gray-900 capitalize">{model.type.replace("_", " ").toLowerCase()}</p>
              </div>
              {/* Illustration-specific params */}
              {illustrationParams && (
                <>
                  {illustrationParams.illustrationStyle && (
                    <div>
                      <span className="text-gray-500">Illustration Style</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.illustrationStyle.find(o => o.value === illustrationParams.illustrationStyle)?.label ?? illustrationParams.illustrationStyle}
                      </p>
                    </div>
                  )}
                  {illustrationParams.colorApproach && (
                    <div>
                      <span className="text-gray-500">Color Approach</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.colorApproach.find(o => o.value === illustrationParams.colorApproach)?.label ?? illustrationParams.colorApproach}
                      </p>
                    </div>
                  )}
                  {illustrationParams.lineQuality && (
                    <div>
                      <span className="text-gray-500">Line Quality</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.lineQuality.find(o => o.value === illustrationParams.lineQuality)?.label ?? illustrationParams.lineQuality}
                      </p>
                    </div>
                  )}
                  {illustrationParams.detailLevel && (
                    <div>
                      <span className="text-gray-500">Detail Level</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.detailLevel.find(o => o.value === illustrationParams.detailLevel)?.label ?? illustrationParams.detailLevel}
                      </p>
                    </div>
                  )}
                  {illustrationParams.mood && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Mood / Atmosphere</span>
                      <p className="font-medium text-gray-900">{illustrationParams.mood}</p>
                    </div>
                  )}
                </>
              )}
              {model.modelDescription && (
                <div className="col-span-2">
                  <span className="text-gray-500">Description</span>
                  <p className="font-medium text-gray-900">{model.modelDescription}</p>
                </div>
              )}
              {model.stylePrompt && (
                <div className="col-span-2">
                  <span className="text-gray-500">Style Prompt</span>
                  <p className="font-medium text-gray-900">{model.stylePrompt}</p>
                </div>
              )}
              {model.negativePrompt && (
                <div className="col-span-2">
                  <span className="text-gray-500">Negative Prompt</span>
                  <p className="font-medium text-gray-900">{model.negativePrompt}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Reference Images</span>
                <p className="font-medium text-gray-900">{model.referenceImages.length}</p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <p className="font-medium text-gray-900 capitalize">{model.status.toLowerCase()}</p>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <PageShell maxWidth="7xl">
      {/* Header */}
      <ModelDetailHeader
        model={model}
        onBack={onNavigateBack}
        onUpdateName={handleUpdateName}
        isUpdating={updateModel.isPending}
      />

      {/* Stepper — full width */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <ModelWizardStepper
          labels={stepLabels}
          currentStep={wizardStep}
          onStepClick={setWizardStep}
        />
      </div>

      {/* 2-column layout (matching BrandAssetDetailPage pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content — left column (2/3) */}
        <div className="md:col-span-2 min-w-0 space-y-6">
          {/* Step content */}
          {isTrainable ? renderTrainableStep() : renderNonTrainableStep()}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            {wizardStep > 1 ? (
              <Button variant="secondary" onClick={prevWizardStep}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {wizardStep < 3 && (
              <Button
                variant="primary"
                onClick={nextWizardStep}
                disabled={!canProceed}
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar — right column (1/3), sticky */}
        <div className="min-w-0">
          <div className="md:sticky md:top-6 space-y-4">
            <ModelInfoCard model={model} />
            {isTrainable && <TrainingStatusCard model={model} />}
            <QuickActionsCard
              model={model}
              onGenerate={() => {
                setWizardStep(3);
              }}
              onRetrain={handleRetrain}
              onSetDefault={handleSetDefault}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </div>
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
    </PageShell>
  );
}
