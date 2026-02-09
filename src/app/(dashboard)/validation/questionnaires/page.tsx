"use client";

import {
  Plus,
  FileQuestion,
  Calendar,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
  active: { label: "Active", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  draft: { label: "Draft", variant: "default" },
};

const questionnaires = [
  {
    id: "1",
    title: "Brand Perception Survey 2025",
    status: "active",
    responseCount: 187,
    targetResponses: 300,
    completionRate: 62,
    createdDate: "Jan 15, 2025",
    questions: 24,
  },
  {
    id: "2",
    title: "Customer Satisfaction & Brand Loyalty",
    status: "completed",
    responseCount: 452,
    targetResponses: 400,
    completionRate: 100,
    createdDate: "Dec 1, 2024",
    questions: 18,
  },
  {
    id: "3",
    title: "New Product Naming Research",
    status: "draft",
    responseCount: 0,
    targetResponses: 200,
    completionRate: 0,
    createdDate: "Feb 5, 2025",
    questions: 12,
  },
];

export default function QuestionnairesPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Questionnaires
          </h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Create Questionnaire
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Create and distribute questionnaires to gather brand insights
        </p>
      </div>

      {/* Questionnaire Cards */}
      <div className="space-y-3">
        {questionnaires.map((q) => {
          const status = statusConfig[q.status];
          return (
            <Card key={q.id} hoverable padding="lg">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileQuestion className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-dark">
                        {q.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={status.variant} size="sm" dot>
                          {status.label}
                        </Badge>
                        <span className="text-xs text-text-dark/40">
                          {q.questions} questions
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Response progress */}
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={q.completionRate}
                      size="sm"
                      variant={q.completionRate >= 100 ? "success" : "default"}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium text-text-dark/60 w-24 text-right">
                      {q.responseCount} / {q.targetResponses} responses
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-text-dark/40">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Created {q.createdDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {q.responseCount} responses
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
