"use client";

import { RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/shared";
import { useRefreshCompetitor } from "../../hooks";

interface QuickActionsCardProps {
  competitorId: string;
}

/** Quick actions sidebar card (refresh, export) */
export function QuickActionsCard({ competitorId }: QuickActionsCardProps) {
  const refresh = useRefreshCompetitor(competitorId);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          icon={RefreshCw}
          onClick={() => refresh.mutate()}
          isLoading={refresh.isPending}
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
    </div>
  );
}
