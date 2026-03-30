"use client";

import { User, Package, Palette, Box, Brush, Camera, Clapperboard } from "lucide-react";
import { TYPE_CONFIG } from "../../constants/model-constants";
import type { ConsistentModelType } from "../../types/consistent-model.types";

const TYPE_ICONS: Record<ConsistentModelType, React.ElementType> = {
  PERSON: User,
  PRODUCT: Package,
  STYLE: Palette,
  OBJECT: Box,
  BRAND_STYLE: Brush,
  PHOTOGRAPHY: Camera,
  ANIMATION: Clapperboard,
};

interface ModelTypeBadgeProps {
  type: ConsistentModelType;
  size?: "sm" | "md";
}

/** Type badge with icon and colored background */
export function ModelTypeBadge({ type, size = "sm" }: ModelTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  const Icon = TYPE_ICONS[type];
  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.color} ${
        isSmall ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <Icon className={isSmall ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </span>
  );
}
