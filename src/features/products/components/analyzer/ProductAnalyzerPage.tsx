"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, FileText, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { useProductsStore } from "../../stores/useProductsStore";
import { useCreateProduct } from "../../hooks";
import { UrlAnalyzerTab } from "./UrlAnalyzerTab";
import { PdfUploadTab } from "./PdfUploadTab";
import { ManualEntryTab } from "./ManualEntryTab";
import { AnalyzingProductModal } from "./AnalyzingProductModal";

// ─── Tab config ───────────────────────────────────────────

type TabId = "url" | "pdf" | "manual";

const TABS: { id: TabId; icon: LucideIcon }[] = [
  { id: "url", icon: Globe },
  { id: "pdf", icon: FileText },
  { id: "manual", icon: Pencil },
];

// ─── Component ────────────────────────────────────────────

interface ProductAnalyzerPageProps {
  onBack: () => void;
  onNavigateToDetail: (id: string) => void;
}

export function ProductAnalyzerPage({
  onBack,
  onNavigateToDetail,
}: ProductAnalyzerPageProps) {
  const { t } = useTranslation("products");
  const {
    activeAnalyzerTab,
    setActiveAnalyzerTab,
    isProcessingModalOpen,
    analyzeResultData,
    setProcessingModalOpen,
  } = useProductsStore();
  const createProduct = useCreateProduct();
  const [createError, setCreateError] = useState<string | null>(null);

  const handleModalComplete = useCallback(() => {
    // Read latest store state to avoid stale closure
    const latestData = useProductsStore.getState().analyzeResultData;
    const result = latestData?.result;
    if (result) {
      setCreateError(null);

      // Map scraped images to create body format
      const scrapedImages = latestData?.scrapedImages;
      const images = scrapedImages?.map((img) => ({
        url: img.url,
        category: img.context === "og-image" ? ("HERO" as const) : undefined,
        altText: img.alt ?? undefined,
      }));

      createProduct.mutateAsync({
        name: result.name,
        description: result.description ?? undefined,
        category: result.category ?? undefined,
        pricingModel: result.pricingModel ?? undefined,
        pricingDetails: result.pricingDetails ?? undefined,
        features: result.features,
        benefits: result.benefits ?? [],
        useCases: result.useCases ?? [],
        source: result.source ?? undefined,
        sourceUrl: result.sourceUrl ?? undefined,
        status: result.status ?? "ANALYZED",
        images,
      }).then((created) => {
        setProcessingModalOpen(false);
        onNavigateToDetail(created.id);
      }).catch((err: unknown) => {
        setProcessingModalOpen(false);
        const message = err instanceof Error ? err.message : t("analyzer.saveFailed");
        setCreateError(message);
      });
    } else {
      setProcessingModalOpen(false);
    }
  }, [createProduct, setProcessingModalOpen, onNavigateToDetail, t]);

  const handleModalCancel = useCallback(() => {
    setProcessingModalOpen(false);
  }, [setProcessingModalOpen]);

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="product-analyzer" className="space-y-6">
        {/* Breadcrumb */}
        <button
          data-testid="analyzer-back-link"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToProducts")}
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("analyzer.title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("analyzer.subtitle")}
          </p>
        </div>

        {/* Tab header */}
        <div className="flex gap-6 border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeAnalyzerTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`analyzer-tab-${tab.id}`}
                onClick={() => setActiveAnalyzerTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`analyzer.tabs.${tab.id}`)}
              </button>
            );
          })}
        </div>

        {/* Error from product creation */}
        {createError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {createError}
          </div>
        )}

        {/* Tab content */}
        {activeAnalyzerTab === "url" && <UrlAnalyzerTab />}
        {activeAnalyzerTab === "pdf" && <PdfUploadTab />}
        {activeAnalyzerTab === "manual" && (
          <ManualEntryTab
            onBack={onBack}
            onNavigateToDetail={onNavigateToDetail}
          />
        )}

        {/* Processing modal */}
        {isProcessingModalOpen && (
          <AnalyzingProductModal
            onComplete={handleModalComplete}
            onCancel={handleModalCancel}
            isApiComplete={analyzeResultData?.status === "complete"}
          />
        )}
      </div>
    </PageShell>
  );
}
