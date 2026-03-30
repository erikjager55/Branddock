"use client";

import { Badge } from "@/components/shared";
import { STATUS_CONFIG } from "../../constants/model-constants";
import type { ConsistentModelStatus } from "../../types/consistent-model.types";

interface ModelStatusBadgeProps {
  status: ConsistentModelStatus;
}

/** Status badge with dot indicator */
export function ModelStatusBadge({ status }: ModelStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
