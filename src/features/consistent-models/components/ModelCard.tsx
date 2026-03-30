"use client";

import { Image, Sparkles } from "lucide-react";
import { Card } from "@/components/shared";
import { ModelTypeBadge } from "./shared/ModelTypeBadge";
import { ModelStatusBadge } from "./shared/ModelStatusBadge";
import type { ConsistentModelWithMeta } from "../types/consistent-model.types";

interface ModelCardProps {
  model: ConsistentModelWithMeta;
  onClick: (id: string) => void;
}

/** Model card for the overview grid */
export function ModelCard({ model, onClick }: ModelCardProps) {
  const isReady = model.status === "READY";

  return (
    <Card
      hoverable
      className={`cursor-pointer transition-all ${
        isReady ? "ring-1 ring-emerald-200" : ""
      }`}
      onClick={() => onClick(model.id)}
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden rounded-t-lg bg-gray-100">
        {model.thumbnailUrl ? (
          <img
            src={model.thumbnailUrl}
            alt={model.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-10 w-10 text-gray-300" />
          </div>
        )}
        {isReady && (
          <div className="absolute bottom-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
            Ready
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{model.name}</h3>
          <ModelStatusBadge status={model.status} />
        </div>

        {model.description && (
          <p className="mb-3 text-sm text-gray-500 line-clamp-2">{model.description}</p>
        )}

        <div className="flex items-center justify-between">
          <ModelTypeBadge type={model.type} />
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Image className="h-3 w-3" />
              {model.referenceImageCount}
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {model.usageCount}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
