"use client";

import { useState } from "react";
import {
  ChevronRight,
  Globe,
  Smartphone,
  Cpu,
  Package,
  UtensilsCrossed,
  Shirt,
  Sparkles,
  Home,
  HeartPulse,
  Factory,
  Car,
  TabletSmartphone,
  Play,
  BriefcaseBusiness,
  Palette,
  Landmark,
  GraduationCap,
  Stethoscope,
  Building2,
  Plane,
  Dumbbell,
  Clapperboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CardLockIndicator } from "@/components/lock";
import { CATEGORY_ICONS } from "../constants/product-constants";
import type { ProductWithMeta } from "../types/product.types";

// ─── Dynamic icon map ─────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Smartphone,
  Cpu,
  Package,
  UtensilsCrossed,
  Shirt,
  Sparkles,
  Home,
  HeartPulse,
  Factory,
  Car,
  TabletSmartphone,
  Play,
  BriefcaseBusiness,
  Palette,
  Landmark,
  GraduationCap,
  Stethoscope,
  Building2,
  Plane,
  Dumbbell,
  Clapperboard,
};

// ─── Helpers ──────────────────────────────────────────────

/** Resolve a human-readable label for a category slug */
function formatCategory(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Component ────────────────────────────────────────────

interface ProductCardProps {
  product: ProductWithMeta;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const iconName =
    CATEGORY_ICONS[product.category ?? ""] ?? CATEGORY_ICONS["default"];
  const Icon = ICON_MAP[iconName] ?? Package;

  const visibleFeatures = product.features.slice(0, 3);
  const remainingCount = Math.max(0, product.features.length - 3);

  // Format category + pricing as "Software & SaaS · Enterprise"
  const metaParts: string[] = [];
  if (product.category) {
    metaParts.push(formatCategory(product.category));
  }
  if (product.pricingModel) {
    metaParts.push(product.pricingModel);
  }

  const heroUrl = product.heroImageUrl;

  const showHeroImage = !!heroUrl && !imageError;

  return (
    <div
      data-testid="product-card"
      role="button"
      tabIndex={0}
      className="relative flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardLockIndicator isLocked={product.isLocked} className="absolute top-3 right-3" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: image/icon + name */}
        <div className="flex items-center gap-3 mb-2">
          {showHeroImage ? (
            <img
              src={heroUrl}
              alt={product.name}
              className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
              <Icon className="h-5 w-5 text-green-600" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {product.name}
            </h3>
            {metaParts.length > 0 && (
              <p className="text-sm text-gray-500">
                {metaParts.join(" \u2022 ")}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        {/* Feature tags */}
        {product.features.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleFeatures.map((feature, idx) => (
              <span
                key={idx}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {feature}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-xs text-gray-400">
                +{remainingCount} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 mt-3" />
    </div>
  );
}
