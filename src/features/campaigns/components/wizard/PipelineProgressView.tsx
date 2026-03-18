"use client";

import React from "react";
import { Check, Loader2, AlertCircle, Palette } from "lucide-react";
import { ProgressBar } from "@/components/shared";
import type { PipelineStep, PipelineStepStatus } from "../../types/campaign-wizard.types";

// ─── Step Status Icon ────────────────────────────────────

function StepStatusIcon({ status }: { status: PipelineStepStatus }) {
  switch (status) {
    case "complete":
      return (
        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        </div>
      );
    case "running":
      return (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        </div>
      );
    case "error":
      return (
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
      );
  }
}

// ─── Enrichment Indicator ──────────────────────────────

function EnrichmentIndicator({ status, blockCount }: { status: 'idle' | 'running' | 'complete' | 'skipped'; blockCount: number }) {
  if (status === 'idle') return null;

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border transition-colors ${
        status === 'running'
          ? 'border-violet-200 bg-violet-50/70'
          : status === 'complete'
            ? 'border-violet-200 bg-violet-50/50'
            : 'border-gray-200 bg-gray-50/50'
      }`}
    >
      {status === 'running' ? (
        <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
      ) : (
        <Palette className={`w-4 h-4 flex-shrink-0 ${status === 'complete' ? 'text-violet-500' : 'text-gray-400'}`} />
      )}
      <span className={`text-sm ${status === 'running' ? 'text-violet-700' : status === 'complete' ? 'text-violet-600' : 'text-gray-500'}`}>
        {status === 'running'
          ? 'Injecting creative inspiration...'
          : status === 'complete'
            ? `${blockCount} cultural reference${blockCount !== 1 ? 's' : ''} injected`
            : 'No creative references found'}
      </span>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────

export interface PipelineStepConfig {
  step: number;
  name: string;
  label: string;
  description: string;
}

interface PipelineProgressViewProps {
  title: string;
  subtitle?: string;
  steps: PipelineStepConfig[];
  pipelineSteps: PipelineStep[];
  enrichmentStatus?: 'idle' | 'running' | 'complete' | 'skipped';
  enrichmentBlockCount?: number;
}

// ─── Component ──────────────────────────────────────────

/** Reusable pipeline progress view for any subset of steps */
export function PipelineProgressView({ title, subtitle, steps, pipelineSteps, enrichmentStatus = 'idle', enrichmentBlockCount = 0 }: PipelineProgressViewProps) {
  const completedSteps = pipelineSteps.filter((s) => s.status === "complete").length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">
          {subtitle ?? `${completedSteps} of ${totalSteps} steps completed`}
        </p>
      </div>

      <ProgressBar value={progressPercent} color="emerald" size="md" showLabel />

      <EnrichmentIndicator status={enrichmentStatus} blockCount={enrichmentBlockCount} />

      <div className="grid grid-cols-1 gap-2">
        {steps.map((config) => {
          const stepData = pipelineSteps.find((s) => s.step === config.step);
          const status = stepData?.status || "pending";
          const preview = stepData?.preview;

          return (
            <div
              key={config.step}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                status === "running"
                  ? "border-primary/30 bg-primary/5"
                  : status === "complete"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : status === "error"
                      ? "border-red-200 bg-red-50/50"
                      : "border-gray-100 bg-gray-50/50"
              }`}
            >
              <StepStatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{config.name}</p>
                  <span
                    className={`text-xs ${
                      status === "running"
                        ? "text-primary"
                        : status === "complete"
                          ? "text-emerald-600"
                          : status === "error"
                            ? "text-red-600"
                            : "text-muted-foreground"
                    }`}
                  >
                    {status === "running"
                      ? config.label
                      : status === "complete"
                        ? "Completed"
                        : status === "error"
                          ? (stepData?.error || "Failed")
                          : "Waiting..."}
                  </span>
                </div>
                {(status === "running" || status === "complete" || status === "error") && (
                  <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                )}
                {preview && status === "complete" && (
                  <p className="text-xs text-emerald-700 mt-1 line-clamp-1">{preview}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
