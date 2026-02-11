"use client";

import { MessageSquare, ShoppingCart, Play, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface WorkshopHeaderProps {
  subtitle: string;
  status: "PURCHASED" | "IN_PROGRESS" | "COMPLETED";
  className?: string;
}

const statusConfig = {
  PURCHASED: { label: "Purchased", icon: ShoppingCart, variant: "info" as const },
  IN_PROGRESS: { label: "In Progress", icon: Play, variant: "warning" as const },
  COMPLETED: { label: "Completed", icon: CheckCircle, variant: "success" as const },
};

export function WorkshopHeader({ subtitle, status, className }: WorkshopHeaderProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-xl p-5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">Canvas Workshop</h1>
            <p className="text-sm text-text-dark/50">{subtitle}</p>
          </div>
        </div>
        <Badge variant={config.variant} size="sm">
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
