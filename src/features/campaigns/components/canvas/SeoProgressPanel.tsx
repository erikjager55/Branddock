"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Circle, Search } from "lucide-react";
import { ProgressBar } from "@/components/shared";
import { useCanvasStore } from "../../stores/useCanvasStore";

/**
 * 8-step SEO pipeline progress panel shown during content generation
 * for website deliverable types (landing-page, product-page, etc.).
 */
export function SeoProgressPanel() {
  const seoSteps = useCanvasStore((s) => s.seoSteps);
  const completedCount = seoSteps.filter((s) => s.status === "complete").length;
  const totalSteps = seoSteps.length;
  const hasError = seoSteps.some((s) => s.status === "error");
  const isRunning = seoSteps.some((s) => s.status === "running" || s.status === "pending");
  const elapsed = useElapsedTimer(isRunning);

  if (seoSteps.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
          <Search className="h-4.5 w-4.5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            SEO Research & Content Pipeline
          </h3>
          <p className="text-xs text-gray-500">
            {hasError
              ? "Pipeline encountered an error"
              : completedCount === totalSteps
                ? `Completed in ${formatTime(elapsed)}`
                : `Step ${completedCount + 1} of ${totalSteps} — ${formatTime(elapsed)}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <ProgressBar
          value={totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0}
          color={hasError ? "red" : completedCount === 8 ? "emerald" : "teal"}
          size="sm"
        />
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {seoSteps.map((step) => (
          <div
            key={step.step}
            className="flex items-start gap-2.5 py-1"
          >
            <StepIcon status={step.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    step.status === "complete"
                      ? "text-gray-900"
                      : step.status === "running"
                        ? "text-teal-700"
                        : step.status === "error"
                          ? "text-red-600"
                          : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
                {step.status === "running" && (
                  <span className="text-xs text-teal-500 animate-pulse">
                    Processing...
                  </span>
                )}
              </div>
              {step.preview && step.status === "complete" && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {step.preview}
                </p>
              )}
              {step.preview && step.status === "error" && (
                <p className="text-xs text-red-500 mt-0.5">
                  {step.preview}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0 animate-spin" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />;
  }
}

function useElapsedTimer(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now();
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  return elapsed;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
