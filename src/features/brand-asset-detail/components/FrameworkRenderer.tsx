"use client";

import { ESGFramework } from "./frameworks/ESGFramework";
import { SWOTFramework } from "./frameworks/SWOTFramework";
import { PurposeKompasFramework } from "./frameworks/PurposeKompasFramework";
import type { FrameworkType, PurposeKompasFrameworkData } from "../types/framework.types";

interface FrameworkRendererProps {
  type: FrameworkType;
  data: unknown;
}

export function FrameworkRenderer({ type, data }: FrameworkRendererProps) {
  if (!data) return null;

  const parsed = typeof data === "string" ? JSON.parse(data) : data;

  switch (type) {
    case "ESG":
      return <ESGFramework data={parsed} />;
    case "SWOT":
      return <SWOTFramework data={parsed} />;
    case "PURPOSE_KOMPAS":
      return <PurposeKompasFramework data={parsed as PurposeKompasFrameworkData} />;
    case "GOLDEN_CIRCLE":
      return null; // Rendered by GoldenCircleSection instead
    case "PURPOSE_WHEEL":
      return null; // Rendered by PurposeWheelSection instead
    case "BRAND_ESSENCE":
      return null; // Rendered by BrandEssenceSection instead
    case "BRAND_PROMISE":
      return null; // Rendered by BrandPromiseSection instead
    case "TRANSFORMATIVE_GOALS":
      return null; // Rendered by TransformativeGoalsSection instead
    case "BRAND_ARCHETYPE":
      return null; // Rendered by BrandArchetypeSection instead
    case "BRAND_PERSONALITY":
      return null; // Rendered by BrandPersonalitySection instead
    default:
      return null; // New framework types are handled by their own sections
  }
}
