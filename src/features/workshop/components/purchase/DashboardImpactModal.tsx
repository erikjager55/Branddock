"use client";

import { useTranslation } from "react-i18next";
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

const STATUS_BADGE_MAP: Record<string, { variant: "default" | "success" | "warning" | "info"; labelKey: string }> = {
  AVAILABLE: { variant: "default", labelKey: "purchase.impact.status.available" },
  IN_PROGRESS: { variant: "info", labelKey: "purchase.impact.status.inProgress" },
  COMPLETED: { variant: "success", labelKey: "purchase.impact.status.completed" },
  VALIDATED: { variant: "success", labelKey: "purchase.impact.status.validated" },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("workshop");
  const config = STATUS_BADGE_MAP[status];
  return (
    <Badge variant={config?.variant ?? "default"} size="sm">
      {config ? t(config.labelKey) : status}
    </Badge>
  );
}

export function DashboardImpactModal({
  isOpen,
  onClose,
  impacts,
  updatedCount,
  isLoading,
}: DashboardImpactModalProps) {
  const { t } = useTranslation("workshop");
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("purchase.impact.title")} size="md">
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">
          {t("purchase.impact.calculating")}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("purchase.impact.summary", { count: updatedCount })}
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
