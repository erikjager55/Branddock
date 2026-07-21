"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { Button } from "@/components/shared";
import { ModelDetailHeader } from "./ModelDetailHeader";
import { ModelWizardStepper } from "./ModelWizardStepper";
import { ReferenceImagesSection } from "./ReferenceImagesSection";
import { GenerateSection } from "./GenerateSection";
import { GenerateReferencesSection } from "./GenerateReferencesSection";
import { TrainingModeChoice } from "./TrainingModeChoice";
import { StyleGuideDetailsSection } from "./StyleGuideDetailsSection";
import { IllustrationStyleSection } from "./IllustrationStyleSection";
import { ModelInfoCard } from "./sidebar/ModelInfoCard";
import { QuickActionsCard } from "./sidebar/QuickActionsCard";
import {
  useConsistentModelDetail,
  useUpdateModel,
  useDeleteModel,
  useUploadReferenceImages,
  useDeleteReferenceImage,
  useGenerateImage,
  useGenerations,
} from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import {
  TRAINABLE_TYPES,
  WIZARD_STEPS_OWN_IMAGES,
  WIZARD_STEPS_SYNTHETIC,
  WIZARD_STEPS_NON_TRAINABLE,
  WIZARD_STEPS_ILLUSTRATION,
  WIZARD_STEPS_ILLUSTRATION_TRAINABLE,
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

/** Maps the raw English WIZARD_STEPS_* label to its i18n slug key. */
const WIZARD_STEP_I18N_KEYS: Record<string, string> = {
  Upload: "upload",
  Showcase: "showcase",
  "Generate References": "generateReferences",
  "Upload & Curate": "uploadCurate",
  "AI Style Analysis": "aiStyleAnalysis",
};

/**
 * Detail page orchestrator — 2-column layout (8/4 split) with wizard stepper.
 *
 * Trainer-ombouw 2026-07-21: geen LoRA-training meer. De referentiebeelden
 * gaan als multi-ref stijlreferenties rechtstreeks de generatie in — een
 * model is klaar zodra er genoeg referentiebeelden zijn.
 */
export function ModelDetailPage({
  modelId,
  onNavigateBack,
  onViewShowcase,
  onNavigateToStudio,
}: ModelDetailPageProps) {
  const { t } = useTranslation(["consistent-models", "consistent-models-registry"]);
  const { data: model, isLoading } = useConsistentModelDetail(modelId);
  const { data: generationsData } = useGenerations(modelId);
  const updateModel = useUpdateModel(modelId);
  const deleteModel = useDeleteModel(modelId);
  const uploadImages = useUploadReferenceImages(modelId);
  const deleteImage = useDeleteReferenceImage(modelId);
  const generateImage = useGenerateImage(modelId);

  const {
    wizardStep,
    setWizardStep,
    nextWizardStep,
    prevWizardStep,
    trainingMode,
    setTrainingMode,
  } = useConsistentModelStore();

  // Auto-detect reference mode from model state so we skip the choice screen
  // when returning to a model that already has images.
  // ILLUSTRATION has its own flow — skip this logic.
  useEffect(() => {
    if (!model || !TRAINABLE_TYPES.has(model.type) || model.type === "ILLUSTRATION") return;
    if (trainingMode) return; // already chosen this session

    if (model.referenceImages.length > 0) {
      const hasAiImages = model.referenceImages.some((img) => img.source === "AI_GENERATED");
      setTrainingMode(hasAiImages ? "synthetic" : "own");
      if (model.status === "READY") {
        setWizardStep(2); // Showcase
      }
    }
  }, [model, trainingMode, setTrainingMode, setWizardStep]);

  // Auto-detect step for ILLUSTRATION models returning to an in-progress or completed model.
  const illustrationStepDetectedRef = useRef(false);
  useEffect(() => {
    if (!model || model.type !== "ILLUSTRATION" || illustrationStepDetectedRef.current) return;
    illustrationStepDetectedRef.current = true;

    if (model.styleAnalysisStatus === "COMPLETE") {
      setWizardStep(model.status === "READY" ? 3 : 2);
    } else if (model.referenceImages.length > 0) {
      setWizardStep(1); // Upload & Curate (has images, not yet analyzed)
    }
    // Otherwise stays at step 1 (Upload & Curate)
  }, [model, setWizardStep]);

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

  const isIllustration = model.type === "ILLUSTRATION";
  const isTrainable = TRAINABLE_TYPES.has(model.type) && !isIllustration; // ILLUSTRATION has its own flow
  const generations = generationsData?.generations ?? [];
  const trainingImageCount = model.referenceImages.filter((img) => img.isTrainingImage).length;
  const hasEnoughReferences = trainingImageCount >= MIN_IMAGES_BY_TYPE[model.type];
  const stepLabels = isIllustration
    ? WIZARD_STEPS_ILLUSTRATION_TRAINABLE
    : isTrainable
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
    if (isIllustration) {
      // Step 1 (Upload & Curate): need minimum reference images
      if (wizardStep === 1) return hasEnoughReferences;
      // Step 2 (AI Style Analysis): need completed analysis to proceed
      if (wizardStep === 2) return model.styleAnalysisStatus === "COMPLETE";
      return true;
    }
    if (isTrainable) {
      if (!trainingMode) return false; // mode not chosen yet
      // Step 1 (Upload / Generate References): need minimum reference images
      if (wizardStep === 1) return hasEnoughReferences;
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
    uploadImages.mutate(files, {
      onSuccess: (result) => {
        if (result.errors.length > 0) {
          const details = result.errors
            .map((e) => `${e.fileName}: ${e.error}`)
            .join("\n");
          window.alert(
            t("detail.uploadPartialAlert", {
              failed: result.errors.length,
              uploaded: result.uploaded.length,
              details,
            }),
          );
        }
      },
      onError: (error: Error) => {
        window.alert(t("detail.uploadFailedAlert", { message: error.message }));
      },
    });
  };

  const handleDeleteImage = (imageId: string) => {
    deleteImage.mutate(imageId);
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
      t("detail.confirmDelete", { name: model.name })
    );
    if (!confirmed) return;
    deleteModel.mutate(undefined, {
      onSuccess: () => {
        onNavigateBack();
      },
    });
  };

  // ─── Step content renderers ──────────────────────────────

  const renderShowcaseStep = () => (
    <GenerateSection
      model={model}
      generations={generations}
      onGenerate={handleGenerate}
      isGenerating={isGenerating}
    />
  );

  const renderIllustrationStep = () => {
    switch (wizardStep) {
      case 1:
        // Step 1: Upload & Curate — upload reference illustrations
        return (
          <ReferenceImagesSection
            images={model.referenceImages}
            modelId={model.id}
            modelType={model.type}
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            isUploading={uploadImages.isPending}
            isDeleting={deleteImage.isPending}
          />
        );
      case 2:
        // Step 2: AI Style Analysis — analyze + review style profile
        return (
          <IllustrationStyleSection model={model} />
        );
      case 3:
        // Step 3: Showcase — generate on-style images directly from references
        return renderShowcaseStep();
      default:
        return null;
    }
  };

  const renderTrainableStep = () => {
    // Show choice screen if no reference mode selected yet
    if (!trainingMode) {
      return <TrainingModeChoice />;
    }

    switch (wizardStep) {
      case 1:
        return trainingMode === "own" ? (
          <ReferenceImagesSection
            images={model.referenceImages}
            modelId={model.id}
            modelType={model.type}
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            isUploading={uploadImages.isPending}
            isDeleting={deleteImage.isPending}
          />
        ) : (
          <GenerateReferencesSection model={model} modelId={modelId} />
        );
      case 2:
        return renderShowcaseStep();
      default:
        return null;
    }
  };

  const renderNonTrainableStep = () => {
    switch (wizardStep) {
      case 1:
        return model.type === "ILLUSTRATION" ? (
          <IllustrationStyleSection model={model} />
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
            modelId={model.id}
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
            <h3 className="text-sm font-semibold text-gray-900">{t("detail.overviewTitle")}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t("detail.name")}</span>
                <p className="font-medium text-gray-900">{model.modelName || model.name}</p>
              </div>
              <div>
                <span className="text-gray-500">{t("detail.type")}</span>
                <p className="font-medium text-gray-900 capitalize">{model.type.replace("_", " ").toLowerCase()}</p>
              </div>
              {/* Illustration-specific params */}
              {illustrationParams && (
                <>
                  {illustrationParams.illustrationStyle && (
                    <div>
                      <span className="text-gray-500">{t("detail.illustrationStyle")}</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.illustrationStyle.find(o => o.value === illustrationParams.illustrationStyle)?.label ?? illustrationParams.illustrationStyle}
                      </p>
                    </div>
                  )}
                  {illustrationParams.colorApproach && (
                    <div>
                      <span className="text-gray-500">{t("detail.colorApproach")}</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.colorApproach.find(o => o.value === illustrationParams.colorApproach)?.label ?? illustrationParams.colorApproach}
                      </p>
                    </div>
                  )}
                  {illustrationParams.lineQuality && (
                    <div>
                      <span className="text-gray-500">{t("detail.lineQuality")}</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.lineQuality.find(o => o.value === illustrationParams.lineQuality)?.label ?? illustrationParams.lineQuality}
                      </p>
                    </div>
                  )}
                  {illustrationParams.detailLevel && (
                    <div>
                      <span className="text-gray-500">{t("detail.detailLevel")}</span>
                      <p className="font-medium text-gray-900">
                        {ILLUSTRATION_STYLE_OPTIONS.detailLevel.find(o => o.value === illustrationParams.detailLevel)?.label ?? illustrationParams.detailLevel}
                      </p>
                    </div>
                  )}
                  {illustrationParams.mood && (
                    <div className="col-span-2">
                      <span className="text-gray-500">{t("detail.mood")}</span>
                      <p className="font-medium text-gray-900">{illustrationParams.mood}</p>
                    </div>
                  )}
                </>
              )}
              {model.modelDescription && (
                <div className="col-span-2">
                  <span className="text-gray-500">{t("detail.description")}</span>
                  <p className="font-medium text-gray-900">{model.modelDescription}</p>
                </div>
              )}
              {model.stylePrompt && (
                <div className="col-span-2">
                  <span className="text-gray-500">{t("detail.stylePrompt")}</span>
                  <p className="font-medium text-gray-900">{model.stylePrompt}</p>
                </div>
              )}
              {model.negativePrompt && (
                <div className="col-span-2">
                  <span className="text-gray-500">{t("detail.negativePrompt")}</span>
                  <p className="font-medium text-gray-900">{model.negativePrompt}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">{t("detail.referenceImages")}</span>
                <p className="font-medium text-gray-900">{model.referenceImages.length}</p>
              </div>
              <div>
                <span className="text-gray-500">{t("detail.status")}</span>
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

      {/* Stepper — full width (hidden when reference mode not yet chosen) */}
      {stepLabels.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <ModelWizardStepper
            labels={stepLabels.map((label) =>
              t(`consistent-models-registry:wizardStep.${WIZARD_STEP_I18N_KEYS[label] ?? label}`, {
                defaultValue: label,
              }),
            )}
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
          {isIllustration
            ? renderIllustrationStep()
            : isTrainable
              ? renderTrainableStep()
              : renderNonTrainableStep()}

          {/* Navigation buttons (hidden when reference mode not yet chosen) */}
          {(isIllustration || !isTrainable || trainingMode) && (
            <div className="flex justify-between">
              {wizardStep > 1 ? (
                <Button variant="secondary" onClick={prevWizardStep}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("detail.back")}
                </Button>
              ) : isTrainable && trainingMode ? (
                <Button variant="secondary" onClick={() => setTrainingMode(null)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t("detail.changeMethod")}
                </Button>
              ) : (
                <div />
              )}
              {/* Hide Continue on synthetic step 1: GenerateReferencesSection
                  has its own "Use Selected & Continue" */}
              {wizardStep < stepLabels.length &&
                !(isTrainable && trainingMode === "synthetic" && wizardStep === 1) && (
                <Button
                  variant="primary"
                  onClick={nextWizardStep}
                  disabled={!canProceed}
                >
                  {t("detail.continue")}
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
    </PageShell>
  );
}
