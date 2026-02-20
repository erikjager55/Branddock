"use client";

import React from "react";
import { Plus } from "lucide-react";
import { SkeletonCard, Button } from "@/components/shared";
import { PageShell, PageHeader, ContentSidebarLayout } from "@/components/ui/layout";
import {
  useAvailableAssets,
  useValidationMethods,
  useCreatePlan,
  useStartValidation,
  usePurchasePlan,
} from "../../hooks";
import { useResearchStore } from "../../stores/useResearchStore";
import { calculatePlanTotal, hasPaidMethods } from "../../lib/pricing-calculator";
import { ValuePropositions } from "./ValuePropositions";
import { AssetSelectorGrid } from "./AssetSelectorGrid";
import { MethodCardList } from "./MethodCardList";
import { ValidationPlanSidebar } from "../shared/ValidationPlanSidebar";

// ─── Types ───────────────────────────────────────────────────

interface CustomValidationPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function CustomValidationPage({
  onBack,
  onNavigate,
}: CustomValidationPageProps) {
  const store = useResearchStore();
  const { data: assets, isLoading: assetsLoading } = useAvailableAssets();
  const { data: methods, isLoading: methodsLoading } = useValidationMethods();
  const createPlan = useCreatePlan();
  const startValidation = useStartValidation();
  const purchasePlan = usePurchasePlan();
  const { toggleAsset } = store;

  // Build sidebar data from store
  const selectedAssetsList = (assets ?? [])
    .filter((a) => store.selectedAssetIds.includes(a.id))
    .map((a) => ({ id: a.id, name: a.name, icon: a.icon || null }));

  const selectedMethodsList = (methods ?? [])
    .filter((m) => (store.methodQuantities[m.type] ?? 0) > 0)
    .map((m) => ({
      type: m.type,
      name: m.name,
      quantity: store.methodQuantities[m.type],
      unitPrice: m.price,
      subtotal: m.price * store.methodQuantities[m.type],
    }));

  const totalPrice = calculatePlanTotal(selectedMethodsList);
  const isPaid = hasPaidMethods(selectedMethodsList);

  function handleToggleAsset(id: string) {
    toggleAsset(id);
  }

  function handleRemoveAsset(id: string) {
    // toggleAsset removes if already selected
    if (store.selectedAssetIds.includes(id)) {
      toggleAsset(id);
    }
  }

  function handleRemoveMethod(type: string) {
    store.setMethodQuantity(type, 0);
  }

  function handlePurchase() {
    createPlan.mutate(
      {
        assetIds: store.selectedAssetIds,
        methods: Object.entries(store.methodQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([type, quantity]) => ({ type, quantity })),
      },
      {
        onSuccess: (data) => {
          if (data?.plan?.id) {
            purchasePlan.mutate(data.plan.id, {
              onSuccess: () => onNavigate("research-hub"),
            });
          }
        },
      }
    );
  }

  function handleStartFree() {
    createPlan.mutate(
      {
        assetIds: store.selectedAssetIds,
        methods: Object.entries(store.methodQuantities)
          .filter(([, qty]) => qty > 0)
          .map(([type, quantity]) => ({ type, quantity })),
      },
      {
        onSuccess: (data) => {
          if (data?.plan?.id) {
            startValidation.mutate(data.plan.id, {
              onSuccess: () => onNavigate("research-hub"),
            });
          }
        },
      }
    );
  }

  return (
    <PageShell>
      <div data-testid="custom-validation-page">
      <PageHeader
        moduleKey="research"
        title="Custom Validation"
        subtitle="Create your own validation criteria"
        actions={
          <Button onClick={handlePurchase} className="gap-2">
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        }
      />

      <ContentSidebarLayout
        sidebar={
          <ValidationPlanSidebar
            selectedAssets={selectedAssetsList}
            selectedMethods={selectedMethodsList}
            totalPrice={totalPrice}
            hasPaidMethods={isPaid}
            onRemoveAsset={handleRemoveAsset}
            onRemoveMethod={handleRemoveMethod}
            onPurchase={handlePurchase}
            onStartFree={handleStartFree}
          />
        }
      >
        {/* Value propositions */}
        <div className="space-y-6">
          <ValuePropositions />

          {/* Step 1: Assets */}
          <div data-testid="asset-selector">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Step 1: Select Assets to Validate
            </h2>
            {assetsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <AssetSelectorGrid
                assets={assets ?? []}
                selectedIds={store.selectedAssetIds}
                onToggle={handleToggleAsset}
              />
            )}
          </div>

          {/* Step 2: Methods */}
          <div data-testid="method-selector">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Step 2: Choose Validation Methods
            </h2>
            {methodsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <MethodCardList
                methods={methods ?? []}
                quantities={store.methodQuantities}
                onQuantityChange={store.setMethodQuantity}
              />
            )}
          </div>
        </div>
      </ContentSidebarLayout>
      </div>
    </PageShell>
  );
}
