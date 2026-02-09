"use client";

import {
  Plus,
  ClipboardCheck,
  Calendar,
  Layers,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

const methodConfig: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  survey: { label: "Survey", variant: "info" },
  "focus-group": { label: "Focus Group", variant: "warning" },
  "ab-test": { label: "A/B Test", variant: "success" },
};

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
  active: { label: "Active", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  draft: { label: "Draft", variant: "default" },
};

const validations = [
  {
    id: "1",
    name: "Brand Voice Validation",
    method: "survey",
    status: "active",
    progress: 72,
    brandAssets: ["Mission Statement", "Brand Voice", "Tagline"],
    startDate: "Jan 20, 2025",
    results: {
      positive: 68,
      neutral: 22,
      negative: 10,
    },
  },
  {
    id: "2",
    name: "Logo Perception Test",
    method: "ab-test",
    status: "completed",
    progress: 100,
    brandAssets: ["Visual Identity", "Logo Variants"],
    startDate: "Dec 10, 2024",
    results: {
      positive: 81,
      neutral: 14,
      negative: 5,
    },
  },
  {
    id: "3",
    name: "Messaging Framework Review",
    method: "focus-group",
    status: "draft",
    progress: 0,
    brandAssets: ["Value Proposition", "Key Messages", "Brand Story"],
    startDate: "Mar 1, 2025",
    results: null,
  },
];

export default function CustomValidationPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Custom Validation
          </h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            New Validation
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Design and run custom validation projects for your brand assets
        </p>
      </div>

      {/* Validation Cards */}
      <div className="space-y-3">
        {validations.map((validation) => {
          const method = methodConfig[validation.method];
          const status = statusConfig[validation.status];
          return (
            <Card key={validation.id} hoverable padding="lg">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-dark">
                        {validation.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={method.variant} size="sm">
                          {method.label}
                        </Badge>
                        <Badge variant={status.variant} size="sm" dot>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Brand Assets */}
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-text-dark/40" />
                    <div className="flex flex-wrap gap-1.5">
                      {validation.brandAssets.map((asset) => (
                        <Badge key={asset} variant="default" size="sm">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Meta + Progress */}
                  <div className="flex items-center gap-4 text-xs text-text-dark/40">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Started {validation.startDate}
                    </span>
                  </div>

                  {validation.progress > 0 && (
                    <div className="flex items-center gap-3">
                      <ProgressBar
                        value={validation.progress}
                        size="sm"
                        variant={validation.progress === 100 ? "success" : "default"}
                        className="flex-1"
                      />
                      <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                        {validation.progress}%
                      </span>
                    </div>
                  )}

                  {/* Results Summary */}
                  {validation.results && (
                    <div className="flex items-center gap-4 pt-2 border-t border-border-dark">
                      <span className="flex items-center gap-1.5 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-text-dark/60">
                          {validation.results.positive}% positive
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-dark/30" />
                        <span className="text-text-dark/60">
                          {validation.results.neutral}% neutral
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-text-dark/60">
                          {validation.results.negative}% negative
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
