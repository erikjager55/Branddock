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
    PUBLISHED: { variant: "success", label: "Published" },
    ARCHIVED: { variant: "warning", label: "Archived" },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
