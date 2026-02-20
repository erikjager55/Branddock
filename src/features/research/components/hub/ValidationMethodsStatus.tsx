"use client";

import React from "react";
import { Building2, MessageSquare, ClipboardList, Bot } from "lucide-react";
import { Skeleton } from "@/components/shared";
import type { MethodStatusResponse } from "../../types/research.types";
import { METHOD_STATUS_CONFIG } from "../../constants/research-constants";

// ─── Icon mapping ────────────────────────────────────────────

const ICON_MAP = {
  Building2,
  MessageSquare,
  ClipboardList,
  Bot,
} as const;

// ─── Types ───────────────────────────────────────────────────

interface ValidationMethodsStatusProps {
  methods: MethodStatusResponse | undefined;
  isLoading?: boolean;
}

// ─── Component ───────────────────────────────────────────────

export function ValidationMethodsStatus({
  methods,
  isLoading,
}: ValidationMethodsStatusProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 space-y-3">
            <Skeleton className="rounded" width="50%" height={16} />
            <Skeleton className="rounded" width="100%" height={12} />
          </div>
        ))}
      </div>
    );
  }

  const m = methods ?? { methods: [] };

  return (
    <div data-testid="method-status" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {METHOD_STATUS_CONFIG.map((config) => {
        const methodData = m.methods.find((md) => md.type === config.type);
        const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];

        return (
          <div key={config.type} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <span className="text-sm font-medium text-gray-900">
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{methodData?.active ?? 0} Active</span>
              <span>{methodData?.done ?? 0} Done</span>
              <span>{methodData?.unlocked ?? 0} Unlocked</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
