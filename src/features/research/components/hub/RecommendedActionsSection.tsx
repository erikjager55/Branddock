"use client";

import React from "react";
import { Shield, Users, Target, ChevronRight, Compass } from "lucide-react";
import { EmptyState } from "@/components/shared";
import type { RecommendedAction } from "../../types/research.types";

// ─── Icon mapping ────────────────────────────────────────────

const ACTION_STYLES: Record<
  RecommendedAction["type"],
  { icon: React.ElementType; iconColor: string }
> = {
  brand: { icon: Shield, iconColor: "text-green-600" },
  persona: { icon: Users, iconColor: "text-purple-600" },
  strategy: { icon: Target, iconColor: "text-green-600" },
};

// ─── Types ───────────────────────────────────────────────────

interface RecommendedActionsSectionProps {
  actions: RecommendedAction[] | undefined;
  onNavigate: (route: string) => void;
}

// ─── Component ───────────────────────────────────────────────

export function RecommendedActionsSection({
  actions,
  onNavigate,
}: RecommendedActionsSectionProps) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Recommended Actions</h3>
        <EmptyState
          icon={Compass}
          title="No recommendations"
          description="Complete some research to receive personalized recommendations."
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Recommended Actions</h3>

      <div className="space-y-3">
        {actions.map((action) => {
          const style = ACTION_STYLES[action.type];
          const Icon = style.icon;

          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.targetRoute)}
              className="w-full bg-white rounded-lg border p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors text-left"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{action.title}</div>
                <div className="text-sm text-gray-600">{action.description}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
