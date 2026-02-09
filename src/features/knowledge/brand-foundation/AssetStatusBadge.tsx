import { Badge } from "@/components/ui/Badge";
import { AssetStatus } from "@/types/brand-asset";

interface AssetStatusBadgeProps {
  status: AssetStatus;
  className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  const variants: Record<
    AssetStatus,
    { variant: "default" | "success" | "warning" | "error"; label: string }
  > = {
    DRAFT: { variant: "default", label: "Draft" },
    ACTIVE: { variant: "success", label: "Active" },
    IN_PROGRESS: { variant: "default", label: "In Progress" },
    AI_ANALYSIS_COMPLETE: { variant: "success", label: "Analyzed" },
    VALIDATED: { variant: "success", label: "Validated" },
    LOCKED: { variant: "warning", label: "Locked" },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
