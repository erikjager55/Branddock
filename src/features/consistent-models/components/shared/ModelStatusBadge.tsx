"use client";

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/shared";
import { STATUS_CONFIG } from "../../constants/model-constants";
import type { ConsistentModelStatus } from "../../types/consistent-model.types";

interface ModelStatusBadgeProps {
  status: ConsistentModelStatus;
}

/** Status badge with dot indicator */
export function ModelStatusBadge({ status }: ModelStatusBadgeProps) {
  const { t } = useTranslation("consistent-models-registry");
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} dot>
      {t(`status.${status}`, { defaultValue: config.label })}
    </Badge>
  );
}
