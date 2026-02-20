"use client";

import React from "react";
import { ArrowLeft, Eye, EyeOff, Save } from "lucide-react";
import { Badge, Button } from "@/components/shared";

interface StudioHeaderProps {
  title: string;
  contentType: string;
  campaignTitle: string;
  lastSavedAt: string | null;
  isPreviewMode: boolean;
  onBack: () => void;
  onTogglePreview: () => void;
}

export function StudioHeader({
  title,
  contentType,
  campaignTitle,
  lastSavedAt,
  isPreviewMode,
  onBack,
  onTogglePreview,
}: StudioHeaderProps) {
  const formatSavedTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} min ago`;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b flex-shrink-0">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
            <Badge variant="default">{contentType}</Badge>
          </div>
          <p className="text-xs text-gray-400">{campaignTitle}</p>
        </div>
      </div>

      {/* Right: Auto-save + Preview + Save */}
      <div className="flex items-center gap-3">
        {lastSavedAt && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Save className="h-3 w-3" />
            Auto-saved {formatSavedTime(lastSavedAt)}
          </span>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={isPreviewMode ? EyeOff : Eye}
          onClick={onTogglePreview}
        >
          {isPreviewMode ? "Edit" : "Preview"}
        </Button>
      </div>
    </div>
  );
}
