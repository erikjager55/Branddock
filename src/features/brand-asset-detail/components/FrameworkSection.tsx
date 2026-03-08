"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/shared";
import { useBrandAssetDetailStore } from "../store/useBrandAssetDetailStore";
import { FrameworkRenderer } from "./FrameworkRenderer";
import { getFrameworkMeta } from "../utils/framework-registry";
import type { FrameworkType } from "../types/framework.types";

interface FrameworkSectionProps {
  frameworkType: FrameworkType;
  frameworkData: unknown;
}

export function FrameworkSection({
  frameworkType,
  frameworkData,
}: FrameworkSectionProps) {
  const isCollapsed = useBrandAssetDetailStore((s) => s.isFrameworkCollapsed);
  const toggleCollapsed = useBrandAssetDetailStore(
    (s) => s.toggleFrameworkCollapsed
  );

  const meta = getFrameworkMeta(frameworkType);

  return (
    <Card>
      <div className="flex items-center justify-between p-4">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-2 text-left hover:bg-gray-50 transition-colors rounded-lg flex-1 -m-1 p-1"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{meta.label}</h2>
            <p className="text-sm text-gray-500">{meta.description}</p>
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <Card.Body>
          <FrameworkRenderer type={frameworkType} data={frameworkData} />
        </Card.Body>
      )}
    </Card>
  );
}
