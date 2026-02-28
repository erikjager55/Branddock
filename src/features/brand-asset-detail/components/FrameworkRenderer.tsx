"use client";

import { ESGFramework } from "./frameworks/ESGFramework";
import { GoldenCircleFramework } from "./frameworks/GoldenCircleFramework";
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
    case "GOLDEN_CIRCLE":
      return <GoldenCircleFramework data={parsed} />;
    case "SWOT":
      return <SWOTFramework data={parsed} />;
    case "PURPOSE_KOMPAS":
      return <PurposeKompasFramework data={parsed as PurposeKompasFrameworkData} />;
    case "PURPOSE_WHEEL":
      return null; // Rendered by PurposeWheelSection instead
    default:
      return null; // New framework types are handled by their own sections
  }
}
