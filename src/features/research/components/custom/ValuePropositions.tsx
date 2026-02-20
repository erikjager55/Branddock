"use client";

import React from "react";
import { Shield, BarChart2, Zap } from "lucide-react";
import { VALUE_PROPOSITIONS } from "../../constants/research-constants";

// ─── Icon mapping ────────────────────────────────────────────

const VP_ICONS = [Shield, BarChart2, Zap] as const;

// ─── Component ───────────────────────────────────────────────

export function ValuePropositions() {
  return (
    <div className="flex flex-wrap gap-4">
      {VALUE_PROPOSITIONS.map((label, index) => {
        const Icon = VP_ICONS[index % VP_ICONS.length];
        return (
          <div
            key={label}
            className="bg-gray-50 rounded-full px-4 py-2 flex items-center gap-2 text-sm text-gray-600"
          >
            <Icon className="w-4 h-4" />
            {label}
          </div>
        );
      })}
    </div>
  );
}
