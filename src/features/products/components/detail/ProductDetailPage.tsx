"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Edit3, Save, X, ExternalLink, Download, Trash2 } from "lucide-react";
import { Button, SkeletonCard, Select } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { LockShield, LockStatusPill, LockBanner, LockOverlay, LockConfirmDialog } from "@/components/lock";
import { VersionPill } from "@/components/versioning/VersionPill";
import { useLockState } from "@/hooks/useLockState";
import { useQueryClient } from "@tanstack/react-query";
import { useProductDetail, useUpdateProduct, useDeleteProduct, useUnlinkPersona, useProductPersonas, productKeys } from "../../hooks";
import {
  SOURCE_BADGES,
  STATUS_BADGES,
  CATEGORY_OPTIONS,
  CATEGORY_GROUPS,
} from "../../constants/product-constants";
import { DescriptionCard } from "./DescriptionCard";
import { PricingModelCard } from "./PricingModelCard";
import { FeaturesSpecsSection } from "./FeaturesSpecsSection";
import { BenefitsSection } from "./BenefitsSection";
import { TargetAudienceSection } from "./TargetAudienceSection";
import { UseCasesSection } from "./UseCasesSection";
import { PersonaSelectorModal } from "./PersonaSelectorModal";
import { ProductImagesSection } from "./ProductImagesSection";
import { AddImageModal } from "./AddImageModal";

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onNavigate?: (section: string) => void;
}

export function ProductDetailPage({
  productId,
  onBack,
  onNavigate,
}: ProductDetailPageProps) {
  const { data: product, isLoading } = useProductDetail(productId);
  const { data: personasData } = useProductPersonas(productId);
  const unlinkPersona = useUnlinkPersona(productId);
  const updateProduct = useUpdateProduct(productId);
  const deleteProduct = useDeleteProduct(productId);
  const qc = useQueryClient();
  const [isPersonaSelectorOpen, setIsPersonaSelectorOpen] = useState(false);
  const [isAddImageOpen, setIsAddImageOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const lock = useLockState({
    entityType: 'products',
    entityId: productId,
    entityName: product?.name ?? 'Product',
    initialState: {
      isLocked: product?.isLocked ?? false,
      lockedAt: product?.lockedAt ?? null,
      lockedBy: product?.lockedBy ?? null,
    },
    onLockChange: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId) });
      qc.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
  // Edit state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPricingModel, setEditPricingModel] = useState("");
  const [editPricingDetails, setEditPricingDetails] = useState("");
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editBenefits, setEditBenefits] = useState<string[]>([]);
  const [editUseCases, setEditUseCases] = useState<string[]>([]);

  // Only populate edit fields on the transition from non-editing to editing
  const wasEditingRef = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (product && isEditing && !wasEditingRef.current) {
      setEditName(product.name);
      setEditDescription(product.description ?? "");
      setEditPricingModel(product.pricingModel ?? "");
      setEditPricingDetails(product.pricingDetails ?? "");
      setEditCategory(product.category ?? null);
      setEditFeatures([...product.features]);
      setEditBenefits([...product.benefits]);
      setEditUseCases([...product.useCases]);
      setSaveError(null);
    }
    wasEditingRef.current = isEditing;
  }, [product, isEditing]);

  const handleSave = () => {
    setSaveError(null);
    updateProduct.mutateAsync({
      name: editName,
      description: editDescription,
      pricingModel: editPricingModel,
      pricingDetails: editPricingDetails,
      category: editCategory ?? undefined,
      features: editFeatures,
      benefits: editBenefits,
      useCases: editUseCases,
    }).then(() => {
      setIsEditing(false);
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save changes";
      setSaveError(message);
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleDownload = () => {
    if (!product) return;
    const categoryLabel = CATEGORY_OPTIONS.find((o) => o.value === product.category)?.label ?? product.category;
    const lines: string[] = [
      product.name,
      "=".repeat(product.name.length),
      "",
    ];
    if (categoryLabel) lines.push(`Category: ${categoryLabel}`);
    if (product.source) lines.push(`Source: ${SOURCE_BADGES[product.source]?.label ?? product.source}`);
    if (product.status) lines.push(`Status: ${STATUS_BADGES[product.status]?.label ?? product.status}`);
    if (product.sourceUrl) lines.push(`Source URL: ${product.sourceUrl}`);
    lines.push("");

    if (product.description) {
      lines.push("Description", "-".repeat(11), product.description, "");
    }
    if (product.pricingModel) {
      lines.push("Pricing", "-".repeat(7));
      lines.push(`Model: ${product.pricingModel}`);
      if (product.pricingDetails) lines.push(`Details: ${product.pricingDetails}`);
      lines.push("");
    }
    if (product.features.length > 0) {
      lines.push("Features & Specifications", "-".repeat(25));
      product.features.forEach((f) => lines.push(`- ${f}`));
      lines.push("");
    }
    if (product.benefits.length > 0) {
      lines.push("Benefits", "-".repeat(8));
      product.benefits.forEach((b, i) => lines.push(`${i + 1}. ${b}`));
      lines.push("");
    }
    if (product.useCases.length > 0) {
      lines.push("Use Cases", "-".repeat(9));
      product.useCases.forEach((u, i) => lines.push(`${i + 1}. ${u}`));
      lines.push("");
    }

    const linked = product.linkedPersonas ?? personasData?.personas?.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })) ?? [];
    if (linked.length > 0) {
      lines.push("Target Audience", "-".repeat(15));
      linked.forEach((p) => lines.push(`- ${p.name}`));
      lines.push("");
    }

    const slug = product.slug ?? product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <PageShell maxWidth="5xl">
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell maxWidth="5xl">
        <div className="space-y-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </button>
          <div className="text-center py-12">
            <p className="text-gray-500">Product not found</p>
          </div>
        </div>
      </PageShell>
    );
  }

  // Resolve personas: from detail linkedPersonas or from separate hook
  const personas =
    product.linkedPersonas ??
    personasData?.personas?.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
    })) ??
    [];

  const linkedPersonaIds = personas.map((p) => p.id);

  const sourceBadge = SOURCE_BADGES[product.source] ?? SOURCE_BADGES["MANUAL"];
  const statusBadge = STATUS_BADGES[product.status] ?? STATUS_BADGES["DRAFT"];

  const handleRemovePersona = (personaId: string) => {
    unlinkPersona.mutate(personaId);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct.mutateAsync();
      // Cancel inflight refetches (triggered by mutation's onSuccess), then wipe all product caches
      await qc.cancelQueries({ queryKey: productKeys.all });
      qc.removeQueries({ queryKey: productKeys.all });
      onBack();
    } catch {
      // Stay on page if delete fails
    }
  };

  const canEdit = isEditing && lock.canEdit;

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="product-detail" className="space-y-6">
        {/* Breadcrumb */}
        <button
          data-testid="product-back-link"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold text-gray-900 mb-2 w-full border-b-2 border-primary bg-transparent outline-none"
              />
            ) : (
              <h1 data-testid="product-detail-name" className="text-2xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
            )}

            {/* Metadata bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {canEdit ? (
                <Select
                  value={editCategory}
                  onChange={setEditCategory}
                  options={CATEGORY_OPTIONS}
                  groups={CATEGORY_GROUPS}
                  placeholder="Category..."
                />
              ) : product.category ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {CATEGORY_OPTIONS.find((o) => o.value === product.category)?.label ?? product.category}
                </span>
              ) : null}
              <span
                className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium ${sourceBadge.color}`}
              >
                {sourceBadge.label}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
              >
                {statusBadge.label}
              </span>
              <VersionPill
                resourceType="PRODUCT"
                resourceId={product.id}
                onRestore={() => {
                  qc.invalidateQueries({ queryKey: productKeys.detail(productId) });
                  qc.invalidateQueries({ queryKey: productKeys.list() });
                }}
              />
              {product.sourceUrl && !isEditing && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source URL
                </a>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-4">
            <LockShield
              isLocked={lock.isLocked}
              isToggling={lock.isToggling}
              onClick={lock.requestToggle}
            />
            <LockStatusPill
              isLocked={lock.isLocked}
              lockedAt={lock.lockedAt}
              lockedBy={lock.lockedBy}
            />
            {isEditing ? (
              <>
                <Button
                  variant="primary"
                  icon={Save}
                  onClick={handleSave}
                  isLoading={updateProduct.isPending}
                >
                  Save
                </Button>
                <Button variant="ghost" icon={X} onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  icon={Download}
                  onClick={handleDownload}
                >
                  Download
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleDelete}
                  isLoading={deleteProduct.isPending}
                  disabled={lock.isLocked}
                >
                  Delete
                </Button>
                <Button
                  data-testid="product-edit-button"
                  variant="secondary"
                  icon={Edit3}
                  onClick={() => setIsEditing(true)}
                  disabled={!lock.canEdit}
                >
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Lock Banner */}
        <LockBanner isLocked={lock.isLocked} onUnlock={lock.requestToggle} />

        {/* Save error */}
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* 1. Description + Pricing (2-col on md+) */}
        {canEdit ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
              <label className="text-sm font-semibold text-gray-900 mb-2 block">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 outline-none focus:border-primary"
              />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-1 block">Pricing Model</label>
                <input
                  type="text"
                  value={editPricingModel}
                  onChange={(e) => setEditPricingModel(e.target.value)}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-1 block">Pricing Details</label>
                <textarea
                  value={editPricingDetails}
                  onChange={(e) => setEditPricingDetails(e.target.value)}
                  rows={2}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2 outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        ) : (
          <LockOverlay isLocked={lock.isLocked}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DescriptionCard description={product.description} />
              <PricingModelCard
                pricingModel={product.pricingModel}
                pricingDetails={product.pricingDetails}
              />
            </div>
          </LockOverlay>
        )}

        {/* 2. Features & Specifications */}
        {canEdit ? (
          <FeaturesSpecsSection
            features={editFeatures}
            isEditing
            onChange={setEditFeatures}
          />
        ) : (
          <LockOverlay isLocked={lock.isLocked}>
            <FeaturesSpecsSection features={product.features} />
          </LockOverlay>
        )}

        {/* 3. Benefits */}
        {canEdit ? (
          <BenefitsSection
            benefits={editBenefits}
            isEditing
            onChange={setEditBenefits}
          />
        ) : (
          <LockOverlay isLocked={lock.isLocked}>
            <BenefitsSection benefits={product.benefits} />
          </LockOverlay>
        )}

        {/* 4. Target Audience (personas) */}
        <TargetAudienceSection
          personas={personas}
          onAdd={() => setIsPersonaSelectorOpen(true)}
          onRemove={handleRemovePersona}
          isLocked={lock.isLocked}
        />

        {/* 5. Use Cases */}
        {canEdit ? (
          <UseCasesSection
            useCases={editUseCases}
            isEditing
            onChange={setEditUseCases}
          />
        ) : (
          <LockOverlay isLocked={lock.isLocked}>
            <UseCasesSection useCases={product.useCases} />
          </LockOverlay>
        )}

        {/* 6. Product Images */}
        <ProductImagesSection
          images={product.images ?? []}
          productId={productId}
          isEditing={canEdit}
          isLocked={lock.isLocked}
          onAddImage={() => setIsAddImageOpen(true)}
        />

        {/* Add Image Modal */}
        <AddImageModal
          isOpen={isAddImageOpen}
          onClose={() => setIsAddImageOpen(false)}
          productId={productId}
        />

        {/* Persona Selector Modal */}
        <PersonaSelectorModal
          isOpen={isPersonaSelectorOpen}
          onClose={() => setIsPersonaSelectorOpen(false)}
          productId={productId}
          linkedPersonaIds={linkedPersonaIds}
          onNavigateToCreatePersona={
            onNavigate ? () => onNavigate("persona-create") : undefined
          }
        />

        {/* Lock Confirm Dialog */}
        <LockConfirmDialog
          isOpen={lock.showConfirm}
          isLocking={!lock.isLocked}
          entityName={product.name}
          onConfirm={lock.confirmToggle}
          onCancel={lock.cancelToggle}
        />
      </div>
    </PageShell>
  );
}
