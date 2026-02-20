"use client";

import { CheckCircle, AlertTriangle, Minus } from "lucide-react";
import { getConfidenceLevel } from "../constants/persona-demographics";

interface PersonaConfidenceBadgeProps {
  percentage: number;
}

function getConfidenceIcon(percentage: number) {
  if (percentage >= 80) return CheckCircle;
  if (percentage >= 50) return Minus;
  return AlertTriangle;
}

export function PersonaConfidenceBadge({
  percentage,
}: PersonaConfidenceBadgeProps) {
  const level = getConfidenceLevel(percentage);
  const Icon = getConfidenceIcon(percentage);

  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-semibold ${level.color}`}>
        {percentage}%
      </span>
      <Icon className={`h-3.5 w-3.5 ${level.color}`} />
    </div>
  );
}
