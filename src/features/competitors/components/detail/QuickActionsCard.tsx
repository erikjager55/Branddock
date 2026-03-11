"use client";

import { useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/shared";
import { useRefreshCompetitor } from "../../hooks";

interface QuickActionsCardProps {
  competitorId: string;
  isLocked?: boolean;
  hasWebsiteUrl?: boolean;
}

/** Quick actions sidebar card (refresh, export) */
export function QuickActionsCard({ competitorId, isLocked, hasWebsiteUrl }: QuickActionsCardProps) {
  const refresh = useRefreshCompetitor(competitorId);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          icon={RefreshCw}
          onClick={() => {
            setRefreshError(null);
            refresh.mutate(undefined, {
              onError: (err) => {
                setRefreshError(err instanceof Error ? err.message : "Refresh failed");
              },
            });
          }}
          isLoading={refresh.isPending}
          disabled={isLocked || !hasWebsiteUrl}
          className="justify-start"
        >
          Refresh Analysis
        </Button>
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          icon={Download}
          onClick={() => {
            // Export placeholder
            alert("Export feature coming soon");
          }}
          className="justify-start"
        >
          Export Data
        </Button>
      </div>
      {refreshError && (
        <p className="mt-2 text-xs text-red-600">{refreshError}</p>
      )}
    </div>
  );
}
