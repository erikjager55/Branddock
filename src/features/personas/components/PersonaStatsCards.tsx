"use client";

import { CheckCircle, AlertTriangle, Users } from "lucide-react";
import type { PersonaStats } from "../types/persona.types";
import type { LucideIcon } from "lucide-react";

interface PersonaStatsCardsProps {
  stats: PersonaStats;
}

interface StatsCardConfig {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  cardBg: string;
  valueColor: string;
}

export function PersonaStatsCards({ stats }: PersonaStatsCardsProps) {
  const cards: StatsCardConfig[] = [
    {
      label: "Ready for strategic use",
      value: stats.ready,
      icon: CheckCircle,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      cardBg: "bg-emerald-50/30",
      valueColor: "text-emerald-600",
    },
    {
      label: "Need more research",
      value: stats.needsWork,
      icon: AlertTriangle,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-500",
      cardBg: "bg-amber-50/30",
      valueColor: "text-amber-500",
    },
    {
      label: "Total personas",
      value: stats.total,
      icon: Users,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-500",
      cardBg: "bg-gray-50",
      valueColor: "text-gray-900",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border border-gray-200 p-5 ${card.cardBg}`}
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
              <Icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div className={`text-3xl font-bold ${card.valueColor}`}>
              {card.value}
            </div>
            <div className="mt-1 text-sm text-gray-500">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}
