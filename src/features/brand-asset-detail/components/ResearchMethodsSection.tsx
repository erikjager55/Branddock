"use client";

import { Card } from "@/components/shared";
import { ResearchMethodCard } from "./ResearchMethodCard";
import type { ResearchMethodDetail } from "../types/brand-asset-detail.types";

const ACTIVE_STATUSES = new Set(['COMPLETED', 'VALIDATED', 'IN_PROGRESS']);

interface ResearchMethodsSectionProps {
  methods: ResearchMethodDetail[];
  validationPercentage: number;
  completedMethods: number;
  totalMethods: number;
  isLocked?: boolean;
  onStartAnalysis?: () => void;
  onStartInterviews?: () => void;
  onStartWorkshop?: () => void;
}

export function ResearchMethodsSection({
  methods,
  completedMethods,
  totalMethods,
  isLocked = false,
  onStartAnalysis,
  onStartInterviews,
  onStartWorkshop,
}: ResearchMethodsSectionProps) {
  const safeMethods = Array.isArray(methods) ? methods : [];
  const visibleMethods = isLocked
    ? safeMethods.filter((m) => ACTIVE_STATUSES.has(m.status))
    : safeMethods;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Research Methods</h3>
            <p className="text-sm text-gray-500">Validate and enrich this asset through research</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-gray-900">
              {completedMethods}/{totalMethods} completed
            </span>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="grid grid-cols-2 gap-3">
          {visibleMethods.map((method) => {
            const navHandler =
              method.method === "AI_EXPLORATION" ? onStartAnalysis :
              method.method === "INTERVIEWS" ? onStartInterviews :
              method.method === "WORKSHOP" ? onStartWorkshop :
              undefined;
            const isCompleted = method.status === "COMPLETED" || method.status === "VALIDATED";
            // Completed/validated methods are always clickable (view results).
            // Non-completed methods are only clickable when unlocked.
            const handler = isCompleted ? navHandler : (isLocked ? undefined : navHandler);
            return (
              <ResearchMethodCard
                key={method.id}
                method={method}
                onStart={handler}
              />
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}
