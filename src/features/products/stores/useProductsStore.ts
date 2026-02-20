import { create } from "zustand";
import type { AnalyzeJobResponse } from "../types/product.types";

interface ProductsStoreState {
  activeAnalyzerTab: "url" | "pdf" | "manual";
  isProcessingModalOpen: boolean;
  processingStep: number;
  selectedProductId: string | null;
  analyzeResultData: AnalyzeJobResponse | null;

  // Actions
  setActiveAnalyzerTab: (tab: "url" | "pdf" | "manual") => void;
  setProcessingModalOpen: (open: boolean) => void;
  setProcessingStep: (step: number) => void;
  setSelectedProductId: (id: string | null) => void;
  setAnalyzeResultData: (data: AnalyzeJobResponse | null) => void;
}

export const useProductsStore = create<ProductsStoreState>((set) => ({
  activeAnalyzerTab: "url",
  isProcessingModalOpen: false,
  processingStep: 0,
  selectedProductId: null,
  analyzeResultData: null,

  setActiveAnalyzerTab: (tab) => set({ activeAnalyzerTab: tab }),
  setProcessingModalOpen: (open) =>
    set({ isProcessingModalOpen: open, ...(open ? {} : { processingStep: 0, analyzeResultData: null }) }),
  setProcessingStep: (step) => set({ processingStep: step }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setAnalyzeResultData: (data) => set({ analyzeResultData: data }),
}));
