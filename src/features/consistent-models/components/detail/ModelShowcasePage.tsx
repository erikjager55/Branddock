"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronDown, Eye, Pencil, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/shared";
import { ModelTypeBadge } from "../shared/ModelTypeBadge";
import { ModelInfoCard } from "./sidebar/ModelInfoCard";
import { TrainingStatusCard } from "./sidebar/TrainingStatusCard";
import { QuickActionsCard } from "./sidebar/QuickActionsCard";
import {
  useConsistentModelDetail,
  useUpdateModel,
  useDeleteModel,
  useGenerations,
} from "../../hooks";
import { useConsistentModelStore } from "../../stores/useConsistentModelStore";
import { TRAINABLE_TYPES } from "../../constants/model-constants";
import type { GeneratedImageWithMeta } from "../../types/consistent-model.types";

interface ModelShowcasePageProps {
  modelId: string;
  onNavigateBack: () => void;
  onNavigateToDetail: () => void;
  onNavigateToStudio?: () => void;
}

/**
 * Editorial portfolio showcase for trained AI models.
 *
 * Layout follows The Clueless pattern:
 * 1. Full-width landscape hero (16:9) with name + description overlay
 * 2. 5-column portrait strip: 2 portraits — center video/image (double-wide) — 2 portraits
 * 3. Info section with sidebar cards (no headshot)
 */
export function ModelShowcasePage({
  modelId,
  onNavigateBack,
  onNavigateToDetail,
  onNavigateToStudio,
}: ModelShowcasePageProps) {
  const { data: model, isLoading } = useConsistentModelDetail(modelId);
  const { data: generationsData } = useGenerations(modelId, { limit: 50 });
  const updateModel = useUpdateModel(modelId);
  const deleteModel = useDeleteModel(modelId);
  const { setWizardStep } = useConsistentModelStore();

  const heroRef = useRef<HTMLDivElement>(null);
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowNav(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    const el = heroRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  if (isLoading || !model) {
    return <ShowcaseSkeleton />;
  }

  const generations = generationsData?.generations ?? [];
  const isTrainable = TRAINABLE_TYPES.has(model.type);
  // sampleImageUrls is a Prisma Json field — ensure it's a string array at runtime
  const rawSamples = model.sampleImageUrls;
  const sampleUrls: string[] = Array.isArray(rawSamples) ? rawSamples.filter((u): u is string => typeof u === 'string') : [];

  // Distribute generated images across the layout slots:
  // [0] = hero (landscape setting shot)
  // [1..4] = 4 portrait slots (side views, front, back)
  // [5] = center slot (video-style hero, double-wide)
  // [6+] = remaining gallery
  // Use sample images as showcase when no user generations exist
  // Sample layout: [0]=hero close-up, [1-5]=portrait strip poses
  const heroImage = generations[0]?.storageUrl ?? sampleUrls[0] ?? model.thumbnailUrl;
  const portraitSlots = generations.length > 0
    ? generations.slice(1, 5)
    : sampleUrls.slice(1, 6).map((url, i) => ({ id: `sample-${i}`, storageUrl: url, prompt: '' } as GeneratedImageWithMeta));
  const centerSlot = generations.length > 0 ? (generations[5] ?? null) : null;
  const remainingGenerations = generations.length > 0 ? generations.slice(6) : [];
  const hasStrip = portraitSlots.length >= 2;
  const hasNoContent = generations.length === 0 && sampleUrls.length === 0;

  // ─── Handlers ──────────────────────────────────────────────

  const handleGenerate = () => {
    if (onNavigateToStudio) {
      useConsistentModelStore.getState().setGenerateInStudio(modelId);
      onNavigateToStudio();
    } else {
      setWizardStep(isTrainable ? 4 : 3);
      onNavigateToDetail();
    }
  };

  const handleArchive = () => {
    if (model.status === "ARCHIVED") return;
    updateModel.mutate({ status: "ARCHIVED" as const });
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${model.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;
    deleteModel.mutate(undefined, {
      onSuccess: () => onNavigateBack(),
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ═══ Sticky nav bar ═══ */}
      <div
        className={`fixed inset-x-0 top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm transition-all duration-300 ${
          showNav ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            AI Trainer
          </button>
          <span className="font-mono text-xs uppercase tracking-wider text-gray-400">
            {model.name}
          </span>
          <button
            type="button"
            onClick={onNavigateToDetail}
            className="flex items-center gap-1.5 text-sm text-teal-600 transition-colors hover:text-teal-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>

      {/* ═══ Main grid: content left, sidebar right ═══ */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* Left column: hero + portrait strip + gallery */}
        <div className="min-w-0">
          {/* Hero */}
          <section
            ref={heroRef}
            className="relative flex items-end overflow-hidden bg-gray-900"
            style={{ minHeight: "60vh" }}
          >
            {heroImage ? (
              <img
                src={heroImage}
                alt={model.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="relative z-10 w-full px-8 pb-12 pt-24">
              <div className="max-w-md space-y-3">
                <ModelTypeBadge type={model.type} />
                <h1 className="font-mono text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {model.name}
                </h1>
                {model.description && (
                  <p className="text-sm leading-relaxed text-white/80">
                    {model.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onNavigateBack}
                className="absolute left-8 top-8 flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to AI Trainer
              </button>
            </div>

            {hasStrip && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
                <ChevronDown className="h-5 w-5 text-white/50" />
              </div>
            )}
          </section>

          {/* Portrait strip */}
          {hasStrip && (
            <PortraitStrip
              portraits={portraitSlots}
              center={centerSlot}
              modelName={model.name}
            />
          )}

          {/* Generated gallery */}
          {remainingGenerations.length > 0 && (
            <div className="space-y-6 bg-stone-50 p-8">
              <h2 className="font-mono text-xs uppercase tracking-wider text-teal-600">
                Gallery
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {remainingGenerations.map((gen) => (
                  <GenerationThumbnail key={gen.id} generation={gen} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: sidebar cards */}
        <div className="space-y-4 bg-stone-50 p-5">
          <QuickActionsCard
            model={model}
            onGenerate={handleGenerate}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onBack={onNavigateBack}
          />
          <ModelInfoCard model={model} />
          {isTrainable && <TrainingStatusCard model={model} />}
        </div>
      </div>

    </div>
  );
}

// ─── Portrait Strip (The Clueless 2-2-4-2-2 layout) ──────────

interface PortraitStripProps {
  portraits: GeneratedImageWithMeta[];
  center: GeneratedImageWithMeta | null;
  modelName: string;
}

/**
 * 5-slot strip matching The Clueless grid:
 * [portrait] [portrait] [CENTER double-wide] [portrait] [portrait]
 *
 * CSS grid: 2fr 2fr 4fr 2fr 2fr  (= 12 units total)
 * If center is missing, the 4 portraits fill a symmetric 3fr 3fr 3fr 3fr grid.
 * If fewer than 4 portraits, adjusts gracefully.
 */
function PortraitStrip({ portraits, center, modelName }: PortraitStripProps) {
  const left = portraits.slice(0, 2);
  const right = portraits.slice(2, 4);

  if (center && left.length + right.length >= 2) {
    // Full Clueless layout: 2-2-4-2-2
    return (
      <div
        className="grid"
        style={{ gridTemplateColumns: "2fr 2fr 4fr 2fr 2fr" }}
      >
        {left.map((gen, i) => (
          <PortraitCell key={gen.id} generation={gen} alt={`${modelName} — side ${i + 1}`} />
        ))}
        {/* Center slot — double-wide */}
        <div className="aspect-[2/3] overflow-hidden bg-gray-100">
          <img
            src={center.storageUrl}
            alt={`${modelName} — feature`}
            className="h-full w-full object-cover"
          />
        </div>
        {right.map((gen, i) => (
          <PortraitCell key={gen.id} generation={gen} alt={`${modelName} — view ${i + 3}`} />
        ))}
      </div>
    );
  }

  // Fallback: no center, show portraits in equal columns
  const all = [...left, ...right];
  if (all.length === 0) return null;

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${all.length}, 1fr)` }}
    >
      {all.map((gen, i) => (
        <PortraitCell key={gen.id} generation={gen} alt={`${modelName} — ${i + 1}`} />
      ))}
    </div>
  );
}

function PortraitCell({
  generation,
  alt,
}: {
  generation: GeneratedImageWithMeta;
  alt: string;
}) {
  return (
    <div className="aspect-[9/16] overflow-hidden bg-gray-100">
      <img
        src={generation.storageUrl}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
      />
    </div>
  );
}

// ─── Generation Thumbnail (with lightbox) ─────────────────────

function GenerationThumbnail({ generation }: { generation: GeneratedImageWithMeta }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-gray-100"
      >
        <img
          src={generation.thumbnailUrl ?? generation.storageUrl}
          alt={generation.prompt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
        <div className="absolute bottom-2 right-2 rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Eye className="h-3 w-3 text-white" />
        </div>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setExpanded(false)}
        >
          <div className="max-h-full max-w-4xl">
            <img
              src={generation.storageUrl}
              alt={generation.prompt}
              className="max-h-[85vh] rounded object-contain"
            />
            {generation.prompt && (
              <p className="mt-3 max-w-2xl text-center text-sm text-white/70">
                {generation.prompt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────

function ShowcaseSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-100" style={{ height: "60vh" }}>
        <Skeleton className="h-full w-full" />
      </div>
      {/* Strip skeleton: 2-2-4-2-2 */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "2fr 2fr 4fr 2fr 2fr" }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={i === 2 ? "aspect-[2/3] bg-gray-50" : "aspect-[9/16] bg-gray-50"}>
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
      <div className="bg-stone-50 px-16 py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4]">
                  <Skeleton className="h-full w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
