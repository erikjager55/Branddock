/**
 * Brand Alignment Context (S7)
 *
 * TanStack Query-based context for brand alignment scan data.
 * No mock data fallback — returns empty state on error.
 */

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchAlignmentOverview,
  fetchAlignmentModules,
  fetchAlignmentHistory,
  startAlignmentScan,
  fetchScanProgress,
  cancelAlignmentScan,
  fetchAlignmentIssues,
  fetchAlignmentIssueById,
  dismissAlignmentIssue,
  fetchFixOptions,
  applyFix,
} from "@/lib/api/alignment";
import { useWorkspace } from "@/hooks/use-workspace";
import type {
  AlignmentOverviewResponse,
  AlignmentModulesResponse,
  AlignmentHistoryResponse,
  StartScanResponse,
  ScanProgressResponse,
  CancelScanResponse,
  AlignmentIssuesResponse,
  AlignmentIssueDetailResponse,
  AlignmentIssueListParams,
  DismissIssueBody,
  DismissIssueResponse,
  FixOptionsResponse,
  ApplyFixBody,
  ApplyFixResponse,
  IssueSeverity,
  IssueStatus,
} from "@/types/brand-alignment";

// =============================================================
// Query key factory
// =============================================================
export const alignmentKeys = {
  all: ["alignment"] as const,
  overview: (workspaceId: string) => ["alignment", "overview", workspaceId] as const,
  modules: (workspaceId: string) => ["alignment", "modules", workspaceId] as const,
  history: (workspaceId: string) => ["alignment", "history", workspaceId] as const,
  scan: (scanId: string) => ["alignment", "scan", scanId] as const,
  issues: (workspaceId: string, params?: AlignmentIssueListParams) =>
    ["alignment", "issues", workspaceId, params ?? {}] as const,
  issueDetail: (id: string) => ["alignment", "issue", id] as const,
  fixOptions: (id: string) => ["alignment", "issue", id, "fix-options"] as const,
};

// =============================================================
// Context type
// =============================================================
interface BrandAlignmentContextType {
  // Overview data
  overview: AlignmentOverviewResponse | undefined;
  isLoading: boolean;
  error: Error | null;

  // Issue filters
  severityFilter: IssueSeverity | undefined;
  setSeverityFilter: (s: IssueSeverity | undefined) => void;
  statusFilter: IssueStatus | undefined;
  setStatusFilter: (s: IssueStatus | undefined) => void;
  moduleFilter: string | undefined;
  setModuleFilter: (m: string | undefined) => void;
}

const BrandAlignmentContext = createContext<BrandAlignmentContextType | undefined>(undefined);

// =============================================================
// Provider
// =============================================================
export function BrandAlignmentProvider({ children }: { children: ReactNode }) {
  const { workspaceId } = useWorkspace();

  // Issue filter state
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | undefined>();
  const [statusFilter, setStatusFilter] = useState<IssueStatus | undefined>();
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();

  const {
    data: overview,
    isLoading,
    error,
  } = useQuery<AlignmentOverviewResponse>({
    queryKey: alignmentKeys.overview(workspaceId ?? ""),
    queryFn: fetchAlignmentOverview,
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  return (
    <BrandAlignmentContext.Provider
      value={{
        overview,
        isLoading,
        error: error as Error | null,
        severityFilter,
        setSeverityFilter,
        statusFilter,
        setStatusFilter,
        moduleFilter,
        setModuleFilter,
      }}
    >
      {children}
    </BrandAlignmentContext.Provider>
  );
}

// =============================================================
// Hooks
// =============================================================

/**
 * Main hook: alignment overview + filter state.
 */
export function useBrandAlignment() {
  const context = useContext(BrandAlignmentContext);
  if (context === undefined) {
    throw new Error("useBrandAlignment must be used within a BrandAlignmentProvider");
  }
  return context;
}

/**
 * Hook: fetch per-module scores.
 */
export function useAlignmentModules() {
  const { workspaceId } = useWorkspace();
  return useQuery<AlignmentModulesResponse>({
    queryKey: alignmentKeys.modules(workspaceId ?? ""),
    queryFn: fetchAlignmentModules,
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Hook: fetch scan history.
 */
export function useAlignmentHistory() {
  const { workspaceId } = useWorkspace();
  return useQuery<AlignmentHistoryResponse>({
    queryKey: alignmentKeys.history(workspaceId ?? ""),
    queryFn: fetchAlignmentHistory,
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Hook: poll scan progress (2s interval while RUNNING).
 */
export function useScanProgress(scanId: string | null) {
  return useQuery<ScanProgressResponse>({
    queryKey: alignmentKeys.scan(scanId ?? ""),
    queryFn: () => fetchScanProgress(scanId!),
    enabled: !!scanId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "RUNNING" ? 2000 : false;
    },
  });
}

/**
 * Hook: fetch alignment issues with filters.
 */
export function useAlignmentIssues(params?: AlignmentIssueListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery<AlignmentIssuesResponse>({
    queryKey: alignmentKeys.issues(workspaceId ?? "", params),
    queryFn: () => fetchAlignmentIssues(params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/**
 * Hook: fetch single issue detail.
 */
export function useAlignmentIssueDetail(id: string | undefined) {
  return useQuery<AlignmentIssueDetailResponse>({
    queryKey: alignmentKeys.issueDetail(id ?? ""),
    queryFn: () => fetchAlignmentIssueById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Hook: fetch fix options for an issue.
 */
export function useFixOptions(issueId: string | null) {
  return useQuery<FixOptionsResponse>({
    queryKey: alignmentKeys.fixOptions(issueId ?? ""),
    queryFn: () => fetchFixOptions(issueId!),
    enabled: !!issueId,
    staleTime: 60_000,
  });
}

/**
 * Mutation: start a new alignment scan.
 */
export function useStartAlignmentScan() {
  const queryClient = useQueryClient();
  return useMutation<StartScanResponse>({
    mutationFn: startAlignmentScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alignmentKeys.all });
    },
  });
}

/**
 * Mutation: cancel a running scan.
 */
export function useCancelScan() {
  const queryClient = useQueryClient();
  return useMutation<CancelScanResponse, Error, string>({
    mutationFn: cancelAlignmentScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alignmentKeys.all });
    },
  });
}

/**
 * Mutation: dismiss an alignment issue.
 */
export function useDismissIssue() {
  const queryClient = useQueryClient();
  return useMutation<DismissIssueResponse, Error, { id: string; body?: DismissIssueBody }>({
    mutationFn: ({ id, body }) => dismissAlignmentIssue(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: alignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: alignmentKeys.issueDetail(variables.id) });
    },
  });
}

/**
 * Mutation: apply a fix option.
 */
export function useApplyFix() {
  const queryClient = useQueryClient();
  return useMutation<ApplyFixResponse, Error, { id: string; body: ApplyFixBody }>({
    mutationFn: ({ id, body }) => applyFix(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: alignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: alignmentKeys.issueDetail(variables.id) });
    },
  });
}
