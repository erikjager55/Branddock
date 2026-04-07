"use client";

import { useState } from "react";
import { Download, Clock, Maximize2, ShieldCheck } from "lucide-react";
import type { GeneratedImageWithMeta } from "../../types/consistent-model.types";

interface GenerationResultCardProps {
  generation: GeneratedImageWithMeta;
}

/** Single generated image card with metadata */
export function GenerationResultCard({
  generation,
}: GenerationResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedTime = generation.generationTimeMs
    ? `${(generation.generationTimeMs / 1000).toFixed(1)}s`
    : null;

  return (
    <>
      <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        {/* Style validation badge */}
        {generation.styleValidationScore != null && (
          <div
            className={`absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              generation.styleValidationScore >= 0.85
                ? "bg-emerald-100 text-emerald-800"
                : generation.styleValidationScore >= 0.7
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
            }`}
            title={
              generation.styleValidationDetails?.deviations?.length
                ? `Deviations: ${(generation.styleValidationDetails.deviations as string[]).join('; ')}`
                : "Style match score"
            }
          >
            <ShieldCheck className="h-3 w-3" />
            {Math.round(generation.styleValidationScore * 100)}%
          </div>
        )}

        <div className="aspect-square">
          <img
            src={generation.thumbnailUrl ?? generation.storageUrl}
            alt={generation.prompt}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              title="View full size"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <a
              href={generation.storageUrl}
              download
              className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-0.5">
            <p className="line-clamp-2 text-xs text-white">
              {generation.prompt}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-white/70">
              <span>
                {generation.width}x{generation.height}
              </span>
              {formattedTime && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formattedTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={() => setIsExpanded(false)}
        >
          <img
            src={generation.storageUrl}
            alt={generation.prompt}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
