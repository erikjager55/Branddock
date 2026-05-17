"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Hand,
  Lightbulb,
  Loader2,
  Undo,
  X,
} from "lucide-react";
import { usePatchObservation } from "../hooks/use-strategy-observations";
import type {
  ObservationConfidence,
  ObservationSeverity,
  StrategyObservationResponse,
} from "../api/brandclaw-observations.api";

interface ObservationCardProps {
  observation: StrategyObservationResponse;
  /** Klik op evidence-link → EvidenceModal openen. */
  onOpenEvidence?: () => void;
}

const SEVERITY_STYLES: Record<ObservationSeverity, { bg: string; text: string; border: string; label: string }> = {
  HIGH: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "High" },
  MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Medium" },
  LOW: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", label: "Low" },
};

const CONFIDENCE_STYLES: Record<ObservationConfidence, { bg: string; text: string; label: string }> = {
  HIGH: { bg: "bg-emerald-50", text: "text-emerald-700", label: "High confidence" },
  MEDIUM: { bg: "bg-blue-50", text: "text-blue-700", label: "Medium confidence" },
  LOW: { bg: "bg-gray-50", text: "text-gray-600", label: "Low confidence" },
};

const DIMENSION_LABELS: Record<string, string> = {
  voice_drift: "Voice drift",
  fidelity_decline: "Fidelity decline",
  review_pattern: "Review pattern",
  alignment_gap: "Alignment gap",
  publish_quality_trend: "Publish quality trend",
};

/**
 * Rendert één Strategy Observation als kaart met severity/confidence
 * badges + summary + action-buttons. Phase A: 3 acties (Mark Read /
 * Mark Acted / Dismiss) + Undo wanneer al gemarkeerd.
 */
export function ObservationCard({ observation, onOpenEvidence }: ObservationCardProps) {
  const patch = usePatchObservation();
  const [dismissReason, setDismissReason] = React.useState("");
  const [showDismissInput, setShowDismissInput] = React.useState(false);

  const severityStyle = SEVERITY_STYLES[observation.severity];
  const confidenceStyle = CONFIDENCE_STYLES[observation.confidence];
  const dimensionLabel = DIMENSION_LABELS[observation.dimension] ?? observation.dimension;

  const isRead = !!observation.markedReadAt;
  const isActed = !!observation.markedActedAt;
  const isDismissed = !!observation.dismissedAt;
  const isFlagged = isRead || isActed || isDismissed;

  const snapshotCount = observation.evidence?.snapshotIds?.length ?? 0;

  const onAction = (action: "markRead" | "markActed" | "dismiss" | "undo", reason?: string) => {
    patch.mutate({ id: observation.id, action, reason });
    if (action === "dismiss") {
      setShowDismissInput(false);
      setDismissReason("");
    }
  };

  return (
    <article
      className={`relative rounded-lg border bg-white p-4 ${
        isDismissed ? "opacity-60" : ""
      } ${severityStyle.border}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${severityStyle.bg} ${severityStyle.text}`}
          >
            <AlertTriangle className="w-3 h-3" />
            {severityStyle.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${confidenceStyle.bg} ${confidenceStyle.text}`}
          >
            <Lightbulb className="w-3 h-3" />
            {confidenceStyle.label}
          </span>
          <span className="text-[11px] text-gray-500">{dimensionLabel}</span>
        </div>

        {isFlagged && (
          <button
            type="button"
            onClick={() => onAction("undo")}
            disabled={patch.isPending}
            title="Undo all flags"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Undo className="w-3 h-3" />
            Undo
          </button>
        )}
      </div>

      <p className="text-sm text-gray-900 leading-snug mb-3">{observation.summary}</p>

      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3">
        <div className="flex items-center gap-2">
          {snapshotCount > 0 && (
            <button
              type="button"
              onClick={onOpenEvidence}
              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {snapshotCount} evidence point{snapshotCount === 1 ? "" : "s"}
            </button>
          )}
          <span className="text-gray-400">
            {new Date(observation.createdAt).toLocaleString("nl-NL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isRead && !isActed && !isDismissed && (
            <span className="inline-flex items-center gap-0.5 text-emerald-600">
              <Eye className="w-3 h-3" /> Read
            </span>
          )}
          {isActed && (
            <span className="inline-flex items-center gap-0.5 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Acted
            </span>
          )}
          {isDismissed && (
            <span className="inline-flex items-center gap-0.5 text-gray-500">
              <EyeOff className="w-3 h-3" /> Dismissed
              {observation.dismissReason && (
                <span className="italic">: {observation.dismissReason.slice(0, 30)}{observation.dismissReason.length > 30 ? "…" : ""}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {!isFlagged && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAction("markRead")}
            disabled={patch.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Eye className="w-3 h-3" />
            Mark Read
          </button>
          <button
            type="button"
            onClick={() => onAction("markActed")}
            disabled={patch.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <Hand className="w-3 h-3" />
            Mark Acted
          </button>
          <button
            type="button"
            onClick={() => setShowDismissInput((v) => !v)}
            disabled={patch.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
          {patch.isPending && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
        </div>
      )}

      {showDismissInput && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="text"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="Reden (optioneel)"
            className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-300"
            maxLength={500}
          />
          <button
            type="button"
            onClick={() => onAction("dismiss", dismissReason.trim() || undefined)}
            disabled={patch.isPending}
            className="px-2 py-1 rounded text-[11px] text-white bg-gray-600 hover:bg-gray-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      )}
    </article>
  );
}
