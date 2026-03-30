"use client";

import { Calendar, Cpu, Hash, Sparkles } from "lucide-react";
import { Card } from "@/components/shared";
import { ModelTypeBadge } from "../../shared/ModelTypeBadge";
import { ModelStatusBadge } from "../../shared/ModelStatusBadge";
import { TriggerWordDisplay } from "../../shared/TriggerWordDisplay";
import type { ConsistentModelDetail } from "../../../types/consistent-model.types";

interface ModelInfoCardProps {
  model: ConsistentModelDetail;
}

/** Sidebar card with model metadata */
export function ModelInfoCard({ model }: ModelInfoCardProps) {
  const createdDate = new Date(model.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Model Info</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <ModelStatusBadge status={model.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Type</span>
          <ModelTypeBadge type={model.type} size="sm" />
        </div>
        {model.triggerWord && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Trigger</span>
            <TriggerWordDisplay triggerWord={model.triggerWord} />
          </div>
        )}
        {model.baseModel && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Base Model</span>
            <span className="text-sm text-gray-700">{model.baseModel}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Created</span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Calendar className="h-3.5 w-3.5" />
            {createdDate}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Images</span>
          <span className="text-sm text-gray-700">
            {model.referenceImages.length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Generations</span>
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Sparkles className="h-3.5 w-3.5" />
            {model.usageCount}
          </span>
        </div>
      </div>
    </Card>
  );
}
