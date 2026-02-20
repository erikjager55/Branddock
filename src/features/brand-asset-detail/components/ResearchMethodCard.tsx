"use client";

import {
  Sparkles,
  Users,
  MessageSquare,
  ClipboardList,
  CheckCircle,
  Clock,
  Play,
} from "lucide-react";
import { Badge, ProgressBar } from "@/components/shared";
import type { ResearchMethodDetail } from "../types/brand-asset-detail.types";

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; time: string }
> = {
  AI_EXPLORATION: {
    label: "AI Exploration",
    icon: Sparkles,
    time: "~15 min",
  },
  WORKSHOP: { label: "Canvas Workshop", icon: Users, time: "~90 min" },
  INTERVIEWS: {
    label: "Stakeholder Interviews",
    icon: MessageSquare,
    time: "~45 min each",
  },
  QUESTIONNAIRE: {
    label: "Questionnaire",
    icon: ClipboardList,
    time: "~20 min",
  },
};

const STATUS_DISPLAY: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  AVAILABLE: { label: "Available", variant: "default" },
  IN_PROGRESS: { label: "In Progress", variant: "info" },
  COMPLETED: { label: "Completed", variant: "success" },
  VALIDATED: { label: "Validated", variant: "success" },
  NOT_STARTED: { label: "Not Started", variant: "default" },
};

interface ResearchMethodCardProps {
  method: ResearchMethodDetail;
  onStart?: () => void;
}

export function ResearchMethodCard({
  method,
  onStart,
}: ResearchMethodCardProps) {
  const config = METHOD_CONFIG[method.method] ?? {
    label: method.method,
    icon: Sparkles,
    time: "",
  };
  const statusDisplay = STATUS_DISPLAY[method.status] ?? {
    label: method.status,
    variant: "default" as const,
  };
  const Icon = config.icon;
  const isCompleted =
    method.status === "COMPLETED" || method.status === "VALIDATED";
  const isClickable = !!onStart;

  const testId = method.method === 'AI_EXPLORATION' ? 'ai-exploration-card' : undefined;

  return (
    <button
      data-testid={testId}
      onClick={isClickable ? onStart : undefined}
      disabled={!isClickable}
      className={`text-left w-full p-3 rounded-lg border transition-colors ${
        isClickable
          ? isCompleted
            ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
            : "border-gray-200 hover:border-teal-300 hover:bg-teal-50 cursor-pointer"
          : "border-gray-100 bg-gray-50 cursor-default"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            isCompleted ? "bg-emerald-100" : "bg-gray-100"
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : isClickable ? (
            <Play className="w-4 h-4 text-teal-600" />
          ) : (
            <Icon className="w-4 h-4 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">
              {config.label}
            </span>
            <Badge variant={statusDisplay.variant} size="sm">
              {statusDisplay.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {config.time}
          </div>
          {method.status === "IN_PROGRESS" && (
            <ProgressBar
              value={method.progress}
              size="sm"
              color="teal"
              className="mt-2"
            />
          )}
        </div>
      </div>
    </button>
  );
}
