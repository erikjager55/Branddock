"use client";

import { Zap } from "lucide-react";
import { Badge, Button } from "@/components/shared";
import type { AssetPlanLayer } from "@/lib/campaigns/strategy-blueprint.types";

interface AssetPlanSectionProps {
  assetPlan: AssetPlanLayer;
  /** Called when user clicks "Bring to Life" — receives deliverable title + contentType */
  onBringToLife?: (deliverableTitle: string, contentType: string) => void;
}

/** Layer 4: Asset Plan — deliverables with briefs, priority, effort */
export function AssetPlanSection({ assetPlan, onBringToLife }: AssetPlanSectionProps) {
  const priorityColors: Record<string, "success" | "warning" | "default"> = {
    "must-have": "success",
    "should-have": "warning",
    "nice-to-have": "default",
  };

  const effortLabels: Record<string, string> = {
    low: "Low Effort",
    medium: "Medium Effort",
    high: "High Effort",
  };

  // Group by priority
  const mustHave = assetPlan.deliverables.filter((d) => d.productionPriority === "must-have");
  const shouldHave = assetPlan.deliverables.filter((d) => d.productionPriority === "should-have");
  const niceToHave = assetPlan.deliverables.filter((d) => d.productionPriority === "nice-to-have");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-gray-900">
          {assetPlan.totalDeliverables} deliverable{assetPlan.totalDeliverables !== 1 ? "s" : ""}
        </span>
        {mustHave.length > 0 && <Badge variant="success">{mustHave.length} must-have</Badge>}
        {shouldHave.length > 0 && <Badge variant="warning">{shouldHave.length} should-have</Badge>}
        {niceToHave.length > 0 && <Badge variant="default">{niceToHave.length} nice-to-have</Badge>}
      </div>

      {assetPlan.prioritySummary && (
        <p className="text-sm text-gray-600">{assetPlan.prioritySummary}</p>
      )}

      {/* Deliverables by priority */}
      {[
        { label: "Must-Have", items: mustHave },
        { label: "Should-Have", items: shouldHave },
        { label: "Nice-to-Have", items: niceToHave },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <div key={group.label}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {group.label} ({group.items.length})
            </h4>
            <div className="space-y-3">
              {group.items.map((deliverable, i) => (
                <div
                  key={i}
                  className="p-4 bg-white border border-gray-200 rounded-lg"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{deliverable.title}</span>
                    <Badge variant={priorityColors[deliverable.productionPriority] ?? "default"}>
                      {deliverable.productionPriority}
                    </Badge>
                    <Badge variant="default">
                      {effortLabels[deliverable.estimatedEffort] ?? deliverable.estimatedEffort}
                    </Badge>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span>{deliverable.contentType}</span>
                    <span>{deliverable.channel}</span>
                    <span>{deliverable.phase}</span>
                  </div>

                  {/* Brief preview */}
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Objective: </span>
                      <span className="text-gray-600">{deliverable.brief.objective}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Key Message: </span>
                      <span className="text-gray-600">{deliverable.brief.keyMessage}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">CTA: </span>
                      <span className="text-gray-600">{deliverable.brief.callToAction}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tone: </span>
                      <span className="text-gray-600">{deliverable.brief.toneDirection}</span>
                    </div>
                    {deliverable.brief.contentOutline.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Outline:</span>
                        <ul className="mt-1 space-y-0.5 pl-3">
                          {deliverable.brief.contentOutline.map((point, j) => (
                            <li key={j} className="text-gray-600 list-disc">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Target Personas */}
                  {deliverable.targetPersonas.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {deliverable.targetPersonas.map((persona) => (
                        <Badge key={persona} variant="teal">{persona}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Bring to Life CTA */}
                  {onBringToLife && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onBringToLife(deliverable.title, deliverable.contentType)}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Bring to Life
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
