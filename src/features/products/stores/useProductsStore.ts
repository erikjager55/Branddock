import { create } from "zustand";
import type { AnalyzeJobResponse } from "../types/product.types";

interface ProductsStoreState {
  activeAnalyzerTab: "url" | "pdf" | "manual";
  isProcessingModalOpen: boolean;
  selectedProductId: string | null;
  analyzeResultData: AnalyzeJobResponse | null;

  // Actions
  setActiveAnalyzerTab: (tab: "url" | "pdf" | "manual") => void;
  setProcessingModalOpen: (open: boolean) => void;
  setSelectedProductId: (id: string | null) => void;
  setAnalyzeResultData: (data: AnalyzeJobResponse | null) => void;
}

export const useProductsStore = create<ProductsStoreState>((set) => ({
  activeAnalyzerTab: "url",
  isProcessingModalOpen: false,
  selectedProductId: null,
  analyzeResultData: null,

  setActiveAnalyzerTab: (tab) => set({ activeAnalyzerTab: tab }),
  setProcessingModalOpen: (open) =>
    set({ isProcessingModalOpen: open, ...(open ? {} : { analyzeResultData: null }) }),
  setSelectedProductId: (id) => set({ selectedProductId: id }),
  setAnalyzeResultData: (data) => set({ analyzeResultData: data }),
}));
