"use client";

import { ESGFramework } from "./frameworks/ESGFramework";
import { GoldenCircleFramework } from "./frameworks/GoldenCircleFramework";
import { SWOTFramework } from "./frameworks/SWOTFramework";
import type { FrameworkType } from "../types/framework.types";

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
    default:
      return <p className="text-gray-500 italic">Unknown framework type</p>;
  }
}
