"use client";

import { Sparkles, Archive, Trash2, ArrowLeft } from "lucide-react";
import { Card, Button } from "@/components/shared";
import type { ConsistentModelDetail } from "../../../types/consistent-model.types";

interface QuickActionsCardProps {
  model: ConsistentModelDetail;
  onGenerate?: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onBack?: () => void;
}

/** Sidebar quick actions card */
export function QuickActionsCard({
  model,
  onGenerate,
  onArchive,
  onDelete,
  onBack,
}: QuickActionsCardProps) {
  const isReady = model.status === "READY";
  const isArchived = model.status === "ARCHIVED";

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Quick Actions
      </h3>
      <div className="space-y-2">
        {isReady && onGenerate && (
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

        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-full justify-start text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Trainer
          </Button>
        )}
      </div>
    </Card>
  );
}
