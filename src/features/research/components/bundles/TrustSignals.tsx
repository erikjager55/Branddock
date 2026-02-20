"use client";

import React from "react";
import { Shield, Star, Users } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface TrustSignalsProps {
  signals: string[];
}

// ─── Icon rotation ───────────────────────────────────────────

const TRUST_ICONS = [Shield, Star, Users] as const;

// ─── Component ───────────────────────────────────────────────

export function TrustSignals({ signals }: TrustSignalsProps) {
  if (signals.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
      {signals.map((signal, index) => {
        const Icon = TRUST_ICONS[index % TRUST_ICONS.length];
        return (
          <div key={index} className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span>{signal}</span>
          </div>
        );
      })}
    </div>
  );
}
