"use client";

import { AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/shared";
import type { SemanticColorRole } from "../utils/semantic-tokens";

export interface SystemRoleRowProps {
  role: SemanticColorRole;
  hex: string | undefined;
  source?: string;
  description: string;
  isOverride: boolean;
  wcagWarning?: { message: string; contrastRatio?: number };
  canEdit: boolean;
  onEdit: () => void;
}

export function SystemRoleRow({
  role,
  hex,
  source,
  description,
  isOverride,
  wcagWarning,
  canEdit,
  onEdit,
}: SystemRoleRowProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      {/* Swatch — inline style omdat Tailwind 4 purge arbitrary hex filtert */}
      <div
        className="w-10 h-10 rounded-md shrink-0 border border-gray-200"
        style={{ backgroundColor: hex ?? "transparent" }}
        aria-label={`Color swatch for ${role}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="font-mono text-sm font-semibold text-gray-900">{role}</code>
          <span className="font-mono text-xs text-gray-500">{hex ?? '—'}</span>
          {isOverride && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
              <Pencil className="w-3 h-3" /> Override
            </span>
          )}
          {wcagWarning && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title={wcagWarning.message}>
              <AlertTriangle className="w-3 h-3" />
              WCAG {wcagWarning.contrastRatio?.toFixed(1) ?? '?'}:1
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        {source && (
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">from: {source}</p>
        )}
      </div>

      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Override
        </Button>
      )}
    </div>
  );
}
