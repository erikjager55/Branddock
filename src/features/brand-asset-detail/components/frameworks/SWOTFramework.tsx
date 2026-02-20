"use client";

import { ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle } from "lucide-react";
import type { SWOTFrameworkData } from "../../types/framework.types";

const QUADRANTS = [
  {
    key: "strengths" as const,
    label: "Strengths",
    icon: ThumbsUp,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconColor: "text-emerald-600",
  },
  {
    key: "weaknesses" as const,
    label: "Weaknesses",
    icon: ThumbsDown,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-600",
  },
  {
    key: "opportunities" as const,
    label: "Opportunities",
    icon: TrendingUp,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    key: "threats" as const,
    label: "Threats",
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-600",
  },
];

export function SWOTFramework({ data }: { data: SWOTFrameworkData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUADRANTS.map(({ key, label, icon: Icon, bg, border, iconColor }) => (
        <div key={key} className={`${bg} ${border} border rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <h4 className="font-medium text-gray-900 text-sm">{label}</h4>
          </div>
          <ul className="space-y-1.5">
            {(data[key] ?? []).map((item, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 flex items-start gap-2"
              >
                <span className="text-gray-400 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
