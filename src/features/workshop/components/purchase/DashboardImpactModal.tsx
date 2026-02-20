"use client";

import { ArrowRight } from "lucide-react";
import { Modal, Badge } from "@/components/shared";
import type { ImpactPreview } from "../../types/workshop-purchase.types";

interface DashboardImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  impacts: ImpactPreview[];
  updatedCount: number;
  isLoading: boolean;
}

const STATUS_BADGE_MAP: Record<string, { variant: "default" | "success" | "warning" | "info"; label: string }> = {
  AVAILABLE: { variant: "default", label: "Available" },
  IN_PROGRESS: { variant: "info", label: "In Progress" },
  COMPLETED: { variant: "success", label: "Completed" },
  VALIDATED: { variant: "success", label: "Validated" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_MAP[status] ?? { variant: "default" as const, label: status };
  return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
}

export function DashboardImpactModal({
  isOpen,
  onClose,
  impacts,
  updatedCount,
  isLoading,
}: DashboardImpactModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dashboard Impact Preview" size="md">
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">
          Calculating impact...
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Purchasing this workshop will update{" "}
            <span className="font-semibold text-gray-900">
              {updatedCount} asset{updatedCount !== 1 ? "s" : ""}
            </span>{" "}
            on your dashboard.
          </p>

          <div className="space-y-3">
            {impacts.map((impact) => (
              <div
                key={impact.assetId}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm font-medium text-gray-900">
                  {impact.assetName}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={impact.currentStatus} />
                  {impact.currentStatus !== impact.afterStatus && (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <StatusBadge status={impact.afterStatus} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
