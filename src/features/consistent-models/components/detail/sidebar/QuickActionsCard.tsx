"use client";

import { Sparkles, RefreshCw, Star, Archive, Trash2 } from "lucide-react";
import { Card, Button } from "@/components/shared";
import type { ConsistentModelDetail } from "../../../types/consistent-model.types";

interface QuickActionsCardProps {
  model: ConsistentModelDetail;
  onGenerate: () => void;
  onRetrain: () => void;
  onSetDefault: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

/** Sidebar quick actions card */
export function QuickActionsCard({
  model,
  onGenerate,
  onRetrain,
  onSetDefault,
  onArchive,
  onDelete,
}: QuickActionsCardProps) {
  const isReady = model.status === "READY";
  const isArchived = model.status === "ARCHIVED";

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Quick Actions
      </h3>
      <div className="space-y-2">
        {isReady && (
          <Button
            variant="primary"
            size="sm"
            onClick={onGenerate}
            className="w-full justify-start"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Image
          </Button>
        )}

        {(isReady || model.status === "TRAINING_FAILED") && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetrain}
            className="w-full justify-start"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {model.status === "TRAINING_FAILED" ? "Retry Training" : "Retrain"}
          </Button>
        )}

        {isReady && !model.isDefault && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSetDefault}
            className="w-full justify-start"
          >
            <Star className="mr-2 h-4 w-4" />
            Set as Default
          </Button>
        )}

        {!isArchived && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onArchive}
            className="w-full justify-start"
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Model
        </Button>
      </div>
    </Card>
  );
}
