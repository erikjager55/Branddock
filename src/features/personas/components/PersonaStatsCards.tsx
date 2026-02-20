"use client";

import { CheckCircle, AlertTriangle, Users } from "lucide-react";
import { StatCard } from "@/components/shared";
import type { PersonaStats } from "../types/persona.types";

interface PersonaStatsCardsProps {
  stats: PersonaStats;
}

export function PersonaStatsCards({ stats }: PersonaStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="Ready for strategic use"
        value={stats.ready}
        icon={CheckCircle}
        valueClassName="text-emerald-600"
      />
      <StatCard
        label="Need more research"
        value={stats.needsWork}
        icon={AlertTriangle}
        valueClassName="text-amber-500"
      />
      <StatCard
        label="Total personas"
        value={stats.total}
        icon={Users}
      />
    </div>
  );
}
