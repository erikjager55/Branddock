"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { Button } from "@/components/shared";
import { ModelDetailHeader } from "./ModelDetailHeader";
import { ModelWizardStepper } from "./ModelWizardStepper";
import { ReferenceImagesSection } from "./ReferenceImagesSection";
import { TrainingSection } from "./TrainingSection";
import { TrainingProgressModal } from "./TrainingProgressModal";
import { GenerateSection } from "./GenerateSection";
import { GenerateReferencesSection } from "./GenerateReferencesSection";
import { TrainingModeChoice } from "./TrainingModeChoice";
import { StyleGuideDetailsSection } from "./StyleGuideDetailsSection";
import { IllustrationStyleSection } from "./IllustrationStyleSection";
import { ModelInfoCard } from "./sidebar/ModelInfoCard";
import { TrainingStatusCard } from "./sidebar/TrainingStatusCard";
import { QuickActionsCard } from "./sidebar/QuickActionsCard";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConsistentModelDetail,
  useUpdateModel,
  useDeleteModel,
  useUploadReferenceImages,
  useDeleteReferenceImage,
  useStartTraining,
  useGenerateImage,
  useGenerations,
  useBackgroundTrainingPoll,
  consistentModelKeys,
} from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import {
  TRAINING_DEFAULTS,
  TRAINABLE_TYPES,
  WIZARD_STEPS_OWN_IMAGES,
  WIZARD_STEPS_SYNTHETIC,
  WIZARD_STEPS_NON_TRAINABLE,
  WIZARD_STEPS_ILLUSTRATION,
  ILLUSTRATION_STYLE_OPTIONS,
  MIN_IMAGES_BY_TYPE,
} from "../../constants/model-constants";
import type { IllustrationStyleParams } from "../../types/consistent-model.types";

interface ModelDetailPageProps {
  modelId: string;
  onNavigateBack: () => void;
  onViewShowcase?: () => void;
  onNavigateToStudio?: () => void;
}

/** Detail page orchestrator — 2-column layout (8/4 split) with wizard stepper */
export function ModelDetailPage({
  modelId,
  onNavigateBack,
  onViewShowcase,
  onNavigateToStudio,
}: ModelDetailPageProps) {
  const { data: model, isLoading } = useConsistentModelDetail(modelId);
  const { data: generationsData } = useGenerations(modelId);
  const updateModel = useUpdateModel(modelId);
  const deleteModel = useDeleteModel(modelId);
  const uploadImages = useUploadReferenceImages(modelId);
  const deleteImage = useDeleteReferenceImage(modelId);
  const startTraining = useStartTraining(modelId);
  const generateImage = useGenerateImage(modelId);

  const qc = useQueryClient();

  // Background polling: polls fal.ai every 30s even when the modal is closed,
  // so training completion is never missed.
  const { data: bgTrainingStatus } = useBackgroundTrainingPoll(modelId, model?.status);

  // When background poll detects training finished, refresh model data
  useEffect(() => {
    if (
      bgTrainingStatus?.status === "READY" ||
      bgTrainingStatus?.status === "TRAINING_FAILED"
    ) {
      qc.invalidateQueries({ queryKey: consistentModelKeys.detail(modelId) });
      qc.invalidateQueries({ queryKey: consistentModelKeys.list() });
    }
  }, [bgTrainingStatus?.status, modelId, qc]);

  const {
    isTrainingModalOpen,
    openTrainingModal,
    closeTrainingModal,
    wizardStep,
    setWizardStep,
    nextWizardStep,
    prevWizardStep,
    trainingMode,
    setTrainingMode,
  } = useConsistentModelStore();

  // Auto-detect training mode from model state so we skip the choice screen
  // when returning to a model that's already past the choice step.
  useEffect(() => {
    if (!model || !TRAINABLE_TYPES.has(model.type)) return;
    if (trainingMode) return; // already chosen this session

    const status = model.status;
    if (status === "TRAINING" || status === "READY" || status === "TRAINING_FAILED") {
      // Model has been trained or is training — infer mode from reference images
      const hasAiImages = model.referenceImages.some((img) => img.source === "AI_GENERATED");
      setTrainingMode(hasAiImages ? "synthetic" : "own");

      // Jump to the correct step
      if (status === "READY") {
        setWizardStep(3); // Showcase
      } else {
        setWizardStep(2); // Training
      }
    } else if (model.referenceImages.length > 0) {
      // Has uploaded images but not yet training — infer mode, stay on step 1
      const hasAiImages = model.referenceImages.some((img) => img.source === "AI_GENERATED");
      setTrainingMode(hasAiImages ? "synthetic" : "own");
    }
  }, [model, trainingMode, setTrainingMode, setWizardStep]);

  // Auto-open training modal once on page load if model is training.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (model?.status === "TRAINING" && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      openTrainingModal();
    }
  }, [model?.status, openTrainingModal]);

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
    ? trainingMode === "own"
      ? WIZARD_STEPS_OWN_IMAGES
      : trainingMode === "synthetic"
        ? WIZARD_STEPS_SYNTHETIC
        : [] // no steps until mode is chosen
    : model.type === "ILLUSTRATION"
      ? WIZARD_STEPS_ILLUSTRATION
      : WIZARD_STEPS_NON_TRAINABLE;

  // ─── canProceed logic ────────────────────────────────────

  const canProceed = (() => {
    if (isTrainable) {
      if (!trainingMode) return false; // mode not chosen yet
      if (trainingMode === "own" && wizardStep === 1) {
        // Upload: need minimum training images
        return model.referenceImages.filter((img) => img.isTrainingImage).length >= MIN_IMAGES_BY_TYPE[model.type];
      }
      if (trainingMode === "synthetic" && wizardStep === 1) {
        // Generate References: need minimum training images selected from AI-generated set
        return model.referenceImages.filter((img) => img.isTrainingImage).length >= MIN_IMAGES_BY_TYPE[model.type];
      }
      // Step 2 (Training): always true — training config is optional
      // Step 3 (Showcase): no next button
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

  // ─── Step content renderers ──────────────────────────────

  const renderTrainableStep = () => {
    // Show choice screen if no training mode selected yet
    if (!trainingMode) {
      return <TrainingModeChoice />;
    }

    if (trainingMode === "own") {
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
              onViewShowcase={onViewShowcase}
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
    }

    // synthetic
    switch (wizardStep) {
      case 1:
        return (
          <GenerateReferencesSection model={model} modelId={modelId} />
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
        onViewShowcase={onViewShowcase}
        isUpdating={updateModel.isPending}
      />

      {/* Stepper — full width (hidden when trainable mode not yet chosen) */}
      {stepLabels.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <ModelWizardStepper
            labels={stepLabels}
            currentStep={wizardStep}
            onStepClick={setWizardStep}
          />
        </div>
      )}

      {/* 2-column layout (matching BrandAssetDetailPage pattern) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content — left column (2/3) */}
        <div className="md:col-span-2 min-w-0 space-y-6">
          {/* Step content */}
          {isTrainable ? renderTrainableStep() : renderNonTrainableStep()}

          {/* Navigation buttons (hidden when trainable mode not yet chosen) */}
          {(!isTrainable || trainingMode) && (
            <div className="flex justify-between">
              {wizardStep > 1 ? (
                <Button variant="secondary" onClick={prevWizardStep}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              ) : isTrainable && trainingMode ? (
                <Button variant="secondary" onClick={() => setTrainingMode(null)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Change method
                </Button>
              ) : (
                <div />
              )}
              {/* Hide Continue when:
                  - synthetic step 1: GenerateReferencesSection has "Use Selected & Continue"
                  - training step (own=2, synthetic=2): TrainingSection has "Start Training", user proceeds after completion */}
              {wizardStep < stepLabels.length &&
                !(isTrainable && trainingMode === "synthetic" && wizardStep === 1) &&
                !(isTrainable && trainingMode && wizardStep === 2 && model.status !== "READY") && (
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
          )}
        </div>

        {/* Sidebar — right column (1/3), sticky */}
        <div className="min-w-0">
          <div className="md:sticky md:top-6 space-y-4">
            <ModelInfoCard model={model} />
            {isTrainable && <TrainingStatusCard model={model} />}
            <QuickActionsCard
              model={model}
              onGenerate={onNavigateToStudio ? () => {
                useConsistentModelStore.getState().setGenerateInStudio(modelId);
                onNavigateToStudio();
              } : undefined}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onBack={onNavigateBack}
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
