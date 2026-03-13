"use client";

import React, { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/shared";
import { useRegenerateBlueprintLayer } from "../../../hooks";
import type { RegenerateLayer } from "@/lib/campaigns/strategy-blueprint.types";

interface RegenerateSectionButtonProps {
  campaignId: string;
  layer: RegenerateLayer;
  label?: string;
}

/** Per-layer regeneration button with feedback textarea */
export function RegenerateSectionButton({ campaignId, layer, label }: RegenerateSectionButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const regenerate = useRegenerateBlueprintLayer(campaignId);

  const handleRegenerate = () => {
    regenerate.mutate(
      { layer, feedback: feedback.trim() },
      {
        onSuccess: () => {
          setShowFeedback(false);
          setFeedback("");
        },
      },
    );
  };

  if (!showFeedback) {
    return (
      <Button
        variant="ghost"
        size="sm"
        icon={RefreshCw}
        onClick={() => setShowFeedback(true)}
      >
        {label || "Regenerate"}
      </Button>
    );
  }

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
      <p className="text-xs font-medium text-gray-700">
        Provide feedback to guide regeneration (optional):
      </p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="e.g., Focus more on LinkedIn for the B2B persona..."
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
      />
      <div className="flex items-center gap-2">
        <Button
          variant="cta"
          size="sm"
          icon={regenerate.isPending ? Loader2 : RefreshCw}
          onClick={handleRegenerate}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? "Regenerating..." : "Regenerate"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowFeedback(false);
            setFeedback("");
          }}
          disabled={regenerate.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
