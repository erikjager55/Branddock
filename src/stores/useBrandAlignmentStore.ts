import { create } from "zustand";
import type { IssueSeverity, IssueStatus } from "@/types/brand-alignment";

export type AlignmentTab = "alignment" | "audit" | "review";

interface BrandAlignmentStore {
  // Tab state
  activeTab: AlignmentTab;

  // Scan state
  activeScanId: string | null;
  isScanning: boolean;
  isScanCompleteModalOpen: boolean;
  scanResultScore: number | null;
  scanResultIssues: number | null;

  // Issue filters
  severityFilter: IssueSeverity | null;
  statusFilter: IssueStatus | null;
  moduleFilter: string | null;

  // Fix modal
  isFixModalOpen: boolean;
  selectedIssueId: string | null;
  selectedFixOption: 'A' | 'B' | 'C' | null;

  // Δ-1 deep-link preload — gezet door Surface D ReviewFindingsCard en
  // Surface E PublishGate findings-block. Wanneer aanwezig opent
  // ContentReviewTab direct met de pre-loaded review/score i.p.v. het
  // paste/url input-form. Mutually exclusive (alleen één tegelijk).
  preloadReviewLogId: string | null;
  preloadFidelityScoreId: string | null;

  // Actions
  setActiveTab: (tab: AlignmentTab) => void;
  setActiveScanId: (id: string | null) => void;
  setIsScanning: (v: boolean) => void;
  openScanCompleteModal: (score: number, issues: number) => void;
  closeScanCompleteModal: () => void;
  setSeverityFilter: (s: IssueSeverity | null) => void;
  setStatusFilter: (s: IssueStatus | null) => void;
  setModuleFilter: (m: string | null) => void;
  openFixModal: (issueId: string) => void;
  closeFixModal: () => void;
  selectFixOption: (key: 'A' | 'B' | 'C') => void;
  setSelectedIssueId: (id: string | null) => void;
  setFixModalOpen: (open: boolean) => void;
  resetFilters: () => void;

  /** Pre-load een externe (paste/url) review via reviewLogId + switch tab. */
  openReviewByLogId: (id: string) => void;
  /** Pre-load een interne (canvas) review via fidelityScoreId + switch tab. */
  openReviewByFidelityScoreId: (id: string) => void;
  /** Reset preload-state (bv. bij "New review" knop). */
  clearPreload: () => void;
}

export const useBrandAlignmentStore = create<BrandAlignmentStore>((set) => ({
  activeTab: "alignment" as AlignmentTab,
  activeScanId: null,
  isScanning: false,
  isScanCompleteModalOpen: false,
  scanResultScore: null,
  scanResultIssues: null,

  severityFilter: null,
  statusFilter: null,
  moduleFilter: null,

  isFixModalOpen: false,
  selectedIssueId: null,
  selectedFixOption: null,

  preloadReviewLogId: null,
  preloadFidelityScoreId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveScanId: (id) => set({ activeScanId: id }),
  setIsScanning: (v) => set({ isScanning: v }),
  openScanCompleteModal: (score, issues) =>
    set({ isScanCompleteModalOpen: true, scanResultScore: score, scanResultIssues: issues }),
  closeScanCompleteModal: () =>
    set({ isScanCompleteModalOpen: false, scanResultScore: null, scanResultIssues: null }),
  setSeverityFilter: (s) => set({ severityFilter: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setModuleFilter: (m) => set({ moduleFilter: m }),
  openFixModal: (issueId) =>
    set({ isFixModalOpen: true, selectedIssueId: issueId, selectedFixOption: null }),
  closeFixModal: () =>
    set({ isFixModalOpen: false, selectedIssueId: null, selectedFixOption: null }),
  selectFixOption: (key) => set({ selectedFixOption: key }),
  setSelectedIssueId: (id) => set({ selectedIssueId: id }),
  setFixModalOpen: (open) =>
    set(open ? { isFixModalOpen: true } : { isFixModalOpen: false, selectedIssueId: null, selectedFixOption: null }),
  resetFilters: () =>
    set({ severityFilter: null, statusFilter: null, moduleFilter: null }),

  openReviewByLogId: (id) =>
    set({
      activeTab: 'review',
      preloadReviewLogId: id,
      preloadFidelityScoreId: null,
    }),
  openReviewByFidelityScoreId: (id) =>
    set({
      activeTab: 'review',
      preloadFidelityScoreId: id,
      preloadReviewLogId: null,
    }),
  clearPreload: () =>
    set({ preloadReviewLogId: null, preloadFidelityScoreId: null }),
}));

// Selectors
export const useActiveScanId = () => useBrandAlignmentStore((s) => s.activeScanId);
export const useIsScanning = () => useBrandAlignmentStore((s) => s.isScanning);
export const useAlignmentSeverityFilter = () => useBrandAlignmentStore((s) => s.severityFilter);
export const useAlignmentStatusFilter = () => useBrandAlignmentStore((s) => s.statusFilter);
export const useAlignmentModuleFilter = () => useBrandAlignmentStore((s) => s.moduleFilter);
export const useIsFixModalOpen = () => useBrandAlignmentStore((s) => s.isFixModalOpen);
export const useSelectedIssueId = () => useBrandAlignmentStore((s) => s.selectedIssueId);
