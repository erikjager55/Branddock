"use client";

import { useState } from "react";
import { ArrowLeft, Palette } from "lucide-react";
import { Button, Skeleton } from "@/components/shared";
import { PageShell } from '@/components/ui/layout';
import { useBrandAssets } from "@/contexts/BrandAssetsContext";
import { useWorkshopBundles } from "../../hooks/useWorkshops";
import { usePurchaseWorkshop } from "../../hooks/usePurchaseWorkshop";
import { usePreviewImpact } from "../../hooks/usePreviewImpact";
import { useWorkshopStore } from "../../store/useWorkshopStore";
import { WorkshopPackageInfo } from "./WorkshopPackageInfo";
import { AssetSelectionToggle } from "./AssetSelectionToggle";
import { BundleList } from "./BundleList";
import { IndividualAssetGrid } from "./IndividualAssetGrid";
import { WorkshopOptions } from "./WorkshopOptions";
import { PurchaseSummary } from "./PurchaseSummary";
import { DashboardImpactModal } from "./DashboardImpactModal";
import {
  WORKSHOP_BASE_PRICE,
  FACILITATOR_PRICE,
} from "../../constants/workshop-pricing";

interface WorkshopPurchasePageProps {
  assetId: string;
  onNavigateBack: () => void;
  onPurchased?: (workshopId: string) => void;
}

export function WorkshopPurchasePage({
  assetId,
  onNavigateBack,
  onPurchased,
}: WorkshopPurchasePageProps) {
  const { brandAssets } = useBrandAssets();
  const { data: bundleData, isLoading } = useWorkshopBundles(assetId);
  const purchase = usePurchaseWorkshop(assetId);
  const preview = usePreviewImpact(assetId);

  const [showImpactModal, setShowImpactModal] = useState(false);

  const store = useWorkshopStore();
  const bundles = bundleData?.bundles ?? [];

  const selectedBundle = bundles.find((b) => b.id === store.selectedBundleId);

  const canPurchase =
    store.selectionMode === "bundles"
      ? store.selectedBundleId !== null
      : store.selectedAssetIds.length > 0;

  // Build line items for summary
  const lineItems: Array<{ label: string; amount: number }> = [];

  if (store.selectionMode === "bundles" && selectedBundle) {
    lineItems.push({
      label: `${selectedBundle.name} x${store.workshopCount}`,
      amount: selectedBundle.finalPrice * store.workshopCount,
    });
  } else if (store.selectionMode === "individual") {
    lineItems.push({
      label: `Workshop base x${store.workshopCount}`,
      amount: WORKSHOP_BASE_PRICE * store.workshopCount,
    });
    if (store.selectedAssetIds.length > 0) {
      lineItems.push({
        label: `${store.selectedAssetIds.length} asset${store.selectedAssetIds.length > 1 ? "s" : ""} included`,
        amount: 0,
      });
    }
  }

  if (store.hasFacilitator) {
    lineItems.push({
      label: `Facilitator x${store.workshopCount}`,
      amount: FACILITATOR_PRICE * store.workshopCount,
    });
  }

  const handlePurchase = () => {
    purchase.mutate(
      {
        bundleId: store.selectionMode === "bundles" ? (store.selectedBundleId ?? undefined) : undefined,
        selectedAssetIds: store.selectionMode === "individual" ? store.selectedAssetIds : undefined,
        workshopCount: store.workshopCount,
        hasFacilitator: store.hasFacilitator,
      },
      {
        onSuccess: (data) => {
          store.reset();
          onPurchased?.(data.workshop.id);
        },
      }
    );
  };

  const handlePreviewImpact = () => {
    const assetIds =
      store.selectionMode === "bundles" && selectedBundle
        ? brandAssets
            .filter((a) => selectedBundle.assetNames.includes(a.title))
            .map((a) => a.id)
        : store.selectedAssetIds;

    if (assetIds.length === 0) return;

    preview.mutate(assetIds);
    setShowImpactModal(true);
  };

  const assets = brandAssets.map((a) => ({
    id: a.id,
    name: a.title,
    category: a.category,
  }));

  if (isLoading) {
    return (
      <PageShell>
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div data-testid="workshop-purchase-page">
      {/* Header */}
      <div className="mb-6">
        <button
          data-testid="back-to-asset-button"
          onClick={onNavigateBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Asset
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Purchase Canvas Workshop
            </h1>
            <p className="text-sm text-gray-500">
              Select a bundle or individual assets for your workshop
            </p>
          </div>
        </div>
      </div>

      {/* 2-column layout */}
      <div data-testid="purchase-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - content */}
        <div className="lg:col-span-2 space-y-6">
          <WorkshopPackageInfo />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Select Assets
              </h2>
              <AssetSelectionToggle
                mode={store.selectionMode}
                onModeChange={store.setSelectionMode}
              />
            </div>

            {store.selectionMode === "bundles" ? (
              <BundleList
                bundles={bundles}
                selectedBundleId={store.selectedBundleId}
                onSelectBundle={(id, price) => store.selectBundle(id, price)}
              />
            ) : (
              <IndividualAssetGrid
                assets={assets}
                selectedAssetIds={store.selectedAssetIds}
                onToggle={store.toggleAssetSelection}
              />
            )}
          </div>

          <WorkshopOptions
            workshopCount={store.workshopCount}
            hasFacilitator={store.hasFacilitator}
            onCountChange={store.setWorkshopCount}
            onFacilitatorChange={store.setHasFacilitator}
          />
        </div>

        {/* Right column - summary */}
        <div>
          <PurchaseSummary
            lineItems={lineItems}
            totalPrice={store.totalPrice}
            isPurchasing={purchase.isPending}
            canPurchase={canPurchase}
            onPurchase={handlePurchase}
            onPreviewImpact={handlePreviewImpact}
          />
        </div>
      </div>

      <DashboardImpactModal
        isOpen={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        impacts={preview.data?.impacts ?? []}
        updatedCount={preview.data?.updatedCount ?? 0}
        isLoading={preview.isPending}
      />
    </div>
    </PageShell>
  );
}
