import { create } from "zustand";
import type { IssueSeverity, IssueStatus } from "@/types/brand-alignment";

interface BrandAlignmentStore {
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

  // Actions
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
}

export const useBrandAlignmentStore = create<BrandAlignmentStore>((set) => ({
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
}));

// Selectors
export const useActiveScanId = () => useBrandAlignmentStore((s) => s.activeScanId);
export const useIsScanning = () => useBrandAlignmentStore((s) => s.isScanning);
export const useAlignmentSeverityFilter = () => useBrandAlignmentStore((s) => s.severityFilter);
export const useAlignmentStatusFilter = () => useBrandAlignmentStore((s) => s.statusFilter);
export const useAlignmentModuleFilter = () => useBrandAlignmentStore((s) => s.moduleFilter);
export const useIsFixModalOpen = () => useBrandAlignmentStore((s) => s.isFixModalOpen);
export const useSelectedIssueId = () => useBrandAlignmentStore((s) => s.selectedIssueId);
