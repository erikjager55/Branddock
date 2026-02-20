"use client";

import { Target, Compass, Package } from "lucide-react";
import type { GoldenCircleFrameworkData } from "../../types/framework.types";

const SECTIONS = [
  { key: "why" as const, label: "WHY", icon: Target, color: "border-amber-400 bg-amber-50" },
  { key: "how" as const, label: "HOW", icon: Compass, color: "border-blue-400 bg-blue-50" },
  { key: "what" as const, label: "WHAT", icon: Package, color: "border-emerald-400 bg-emerald-50" },
];

export function GoldenCircleFramework({
  data,
}: {
  data: GoldenCircleFrameworkData;
}) {
  return (
    <div className="space-y-4">
      {SECTIONS.map(({ key, label, icon: Icon, color }) => {
        const section = data[key];
        if (!section) return null;
        return (
          <div
            key={key}
            className={`border-l-4 rounded-r-lg p-4 ${color}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {label}
              </span>
            </div>
            <p className="font-medium text-gray-900">{section.statement}</p>
            {section.details && (
              <p className="text-sm text-gray-600 mt-1">{section.details}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
