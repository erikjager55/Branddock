"use client";

import { useState } from "react";
import {
  Sparkles,
  Plus,
  Calendar,
  Brain,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "default" }> = {
  completed: { label: "Completed", variant: "success" },
  running: { label: "Running", variant: "info" },
  draft: { label: "Draft", variant: "default" },
};

const explorations = [
  {
    id: "1",
    topic: "Brand Voice Consistency Analysis",
    model: "Claude 4.5 Sonnet",
    status: "completed",
    date: "Feb 5, 2025",
    findings: [
      "Brand voice is consistent across 87% of touchpoints",
      "Social media tone deviates from brand guidelines",
      "Email campaigns show strongest alignment",
    ],
  },
  {
    id: "2",
    topic: "Target Audience Sentiment Deep Dive",
    model: "GPT-4",
    status: "running",
    date: "Feb 8, 2025",
    findings: [
      "Positive sentiment trending upward (+12% MoM)",
      "Key concern: pricing perception among 25-34 age group",
    ],
  },
  {
    id: "3",
    topic: "Competitor Messaging Gap Analysis",
    model: "Claude 4.5 Sonnet",
    status: "completed",
    date: "Jan 28, 2025",
    findings: [
      "3 unaddressed market positioning opportunities identified",
      "Sustainability messaging is underrepresented vs. competitors",
      "Technical expertise messaging is a key differentiator",
    ],
  },
];

export default function AIExplorationPage() {
  const [showNewFlow, setShowNewFlow] = useState(false);

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            AI Exploration
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowNewFlow(!showNewFlow)}
          >
            Start Exploration
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Use AI to explore and validate your brand assumptions
        </p>
      </div>

      {/* Start New Flow */}
      {showNewFlow && (
        <Card padding="lg" className="mb-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-dark">
              New Exploration
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-dark">
                  Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g., Brand perception among millennials"
                  className="h-10 w-full rounded-md border border-border-dark bg-surface-dark px-3 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-dark">
                  Brand Assets to Analyze
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Brand Foundation",
                    "Personas",
                    "Products",
                    "Brandstyle",
                  ].map((asset) => (
                    <button
                      key={asset}
                      className="px-3 py-1.5 rounded-full border border-border-dark text-xs font-medium text-text-dark/60 hover:border-primary hover:text-primary transition-colors"
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewFlow(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Run Exploration
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Exploration Cards */}
      <div className="space-y-3">
        {explorations.map((exploration) => {
          const status = statusConfig[exploration.status];
          return (
            <Card key={exploration.id} hoverable padding="lg">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-dark">
                        {exploration.topic}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={status.variant} size="sm" dot>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-dark/40">
                    <span className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" />
                      {exploration.model}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {exploration.date}
                    </span>
                  </div>
                  {/* Key Findings */}
                  <div>
                    <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                      Key Findings
                    </p>
                    <ul className="space-y-1">
                      {exploration.findings.map((finding) => (
                        <li
                          key={finding}
                          className="text-xs text-text-dark/60 flex items-start gap-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          {finding}
                        </li>
                      ))}
                    </ul>
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
