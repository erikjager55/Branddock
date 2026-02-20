"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Edit3, Save, X } from "lucide-react";
import { Button, SkeletonCard } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { useProductDetail, useUpdateProduct, useUnlinkPersona, useProductPersonas } from "../../hooks";
import {
  SOURCE_BADGES,
  STATUS_BADGES,
} from "../../constants/product-constants";
import { DescriptionCard } from "./DescriptionCard";
import { PricingModelCard } from "./PricingModelCard";
import { FeaturesSpecsSection } from "./FeaturesSpecsSection";
import { BenefitsSection } from "./BenefitsSection";
import { TargetAudienceSection } from "./TargetAudienceSection";
import { UseCasesSection } from "./UseCasesSection";
import { PersonaSelectorModal } from "./PersonaSelectorModal";

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
}

export function ProductDetailPage({
  productId,
  onBack,
}: ProductDetailPageProps) {
  const { data: product, isLoading } = useProductDetail(productId);
  const { data: personasData } = useProductPersonas(productId);
  const unlinkPersona = useUnlinkPersona(productId);
  const updateProduct = useUpdateProduct(productId);
  const [isPersonaSelectorOpen, setIsPersonaSelectorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPricingModel, setEditPricingModel] = useState("");
  const [editPricingDetails, setEditPricingDetails] = useState("");

  // Sync edit state when product loads or editing starts
  useEffect(() => {
    if (product && isEditing) {
      setEditName(product.name);
      setEditDescription(product.description ?? "");
      setEditPricingModel(product.pricingModel ?? "");
      setEditPricingDetails(product.pricingDetails ?? "");
    }
  }, [product, isEditing]);

  const handleSave = () => {
    updateProduct.mutateAsync({
      name: editName,
      description: editDescription || undefined,
      pricingModel: editPricingModel || undefined,
      pricingDetails: editPricingDetails || undefined,
    }).then(() => {
      setIsEditing(false);
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
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
            </div>
          </div>

          {/* Edit/Save buttons */}
          <div className="flex items-center gap-2 ml-4">
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
              <Button data-testid="product-edit-button" variant="secondary" icon={Edit3} onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* 1. Description + Pricing (2-col on md+) */}
        {isEditing ? (
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DescriptionCard description={product.description} />
            <PricingModelCard
              pricingModel={product.pricingModel}
              pricingDetails={product.pricingDetails}
            />
          </div>
        )}

        {/* 2. Features & Specifications */}
        {product.features.length > 0 && (
          <FeaturesSpecsSection features={product.features} />
        )}

        {/* 3. Benefits */}
        {product.benefits.length > 0 && (
          <BenefitsSection benefits={product.benefits} />
        )}

        {/* 4. Target Audience (personas) */}
        <TargetAudienceSection
          personas={personas}
          onAdd={() => setIsPersonaSelectorOpen(true)}
          onRemove={handleRemovePersona}
        />

        {/* 5. Use Cases */}
        {product.useCases.length > 0 && (
          <UseCasesSection useCases={product.useCases} />
        )}

        {/* Persona Selector Modal */}
        <PersonaSelectorModal
          isOpen={isPersonaSelectorOpen}
          onClose={() => setIsPersonaSelectorOpen(false)}
          productId={productId}
          linkedPersonaIds={linkedPersonaIds}
        />
      </div>
    </PageShell>
  );
}
