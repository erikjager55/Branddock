"use client";

import { Card, ProgressBar } from "@/components/shared";
import { ResearchMethodCard } from "./ResearchMethodCard";
import type { ResearchMethodDetail } from "../types/brand-asset-detail.types";

interface ResearchMethodsSectionProps {
  methods: ResearchMethodDetail[];
  validationPercentage: number;
  completedMethods: number;
  totalMethods: number;
  onStartAnalysis?: () => void;
  onStartInterviews?: () => void;
  onStartWorkshop?: () => void;
}

export function ResearchMethodsSection({
  methods,
  validationPercentage,
  completedMethods,
  totalMethods,
  onStartAnalysis,
  onStartInterviews,
  onStartWorkshop,
}: ResearchMethodsSectionProps) {
  const safeMethods = Array.isArray(methods) ? methods : [];

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Research Methods
            </h2>
            <p className="text-sm text-gray-500">
              {Math.round(validationPercentage)}% Validated · {completedMethods}{" "}
              of {totalMethods} completed
            </p>
          </div>
          <ProgressBar
            value={validationPercentage}
            color="teal"
            size="sm"
            className="w-32"
          />
        </div>
      </Card.Header>
      <Card.Body>
        <div className="grid grid-cols-2 gap-3">
          {safeMethods.map((method) => {
            const startHandler =
              method.method === "AI_EXPLORATION" ? onStartAnalysis :
              method.method === "INTERVIEWS" ? onStartInterviews :
              method.method === "WORKSHOP" ? onStartWorkshop :
              undefined;
            return (
              <ResearchMethodCard
                key={method.id}
                method={method}
                onStart={startHandler}
              />
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}
