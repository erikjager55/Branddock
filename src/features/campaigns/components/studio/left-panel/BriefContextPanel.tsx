"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";
import { STUDIO } from "@/lib/constants/design-tokens";

export function BriefContextPanel() {
  const brief = useContentStudioStore((s) => s.deliverableBrief);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!brief) return null;

  const hasContent =
    brief.keyMessage || brief.toneDirection || brief.callToAction || brief.objective ||
    (brief.contentOutline && brief.contentOutline.length > 0);

  if (!hasContent) return null;

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-2">
          <FileText className={`h-4 w-4 ${STUDIO.toolbar.active.text}`} />
          <span className={`text-xs font-semibold ${STUDIO.sectionHeader}`}>Brief Context</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-2.5">
          {brief.keyMessage && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Key Message</p>
              <p className="text-xs text-gray-800 leading-relaxed">{brief.keyMessage}</p>
            </div>
          )}
          {brief.toneDirection && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Tone</p>
              <p className="text-xs text-gray-700">{brief.toneDirection}</p>
            </div>
          )}
          {brief.callToAction && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Call to Action</p>
              <p className="text-xs text-gray-700">{brief.callToAction}</p>
            </div>
          )}
          {brief.objective && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Objective</p>
              <p className="text-xs text-gray-700">{brief.objective}</p>
            </div>
          )}
          {brief.contentOutline && brief.contentOutline.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">Content Outline</p>
              <ul className="text-xs text-gray-700 space-y-0.5 ml-3 list-disc">
                {brief.contentOutline.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
