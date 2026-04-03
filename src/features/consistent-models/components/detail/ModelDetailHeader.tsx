"use client";

import { useState } from "react";
import { ArrowLeft, Pencil, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/shared";
import { ModelTypeBadge } from "../shared/ModelTypeBadge";
import { ModelStatusBadge } from "../shared/ModelStatusBadge";
import { TriggerWordDisplay } from "../shared/TriggerWordDisplay";
import { TRAINABLE_TYPES } from "../../constants/model-constants";
import type { ConsistentModelDetail } from "../../types/consistent-model.types";

interface ModelDetailHeaderProps {
  model: ConsistentModelDetail;
  onBack: () => void;
  onUpdateName: (name: string) => void;
  onViewShowcase?: () => void;
  isUpdating: boolean;
}

/** Header with name (inline edit), type badge, status, and breadcrumb */
export function ModelDetailHeader({
  model,
  onBack,
  onUpdateName,
  onViewShowcase,
  isUpdating,
}: ModelDetailHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(model.name);

  const handleSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== model.name) {
      onUpdateName(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(model.name);
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI Models
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xl font-bold text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded p-1 text-gray-400 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <h1
                className="group flex cursor-pointer items-center gap-2 text-xl font-bold text-gray-900"
                onClick={() => setIsEditing(true)}
              >
                {model.name}
                <Pencil className="h-4 w-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ModelTypeBadge type={model.type} />
            <ModelStatusBadge status={model.status} />
            {TRAINABLE_TYPES.has(model.type) && model.triggerWord && (
              <TriggerWordDisplay triggerWord={model.triggerWord} />
            )}
          </div>

          {model.description && (
            <p className="text-sm text-gray-500">{model.description}</p>
          )}
        </div>

        {model.status === "READY" && onViewShowcase && (
          <button
            type="button"
            onClick={onViewShowcase}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <Eye className="h-4 w-4" />
            View Showcase
          </button>
        )}
      </div>
    </div>
  );
}
