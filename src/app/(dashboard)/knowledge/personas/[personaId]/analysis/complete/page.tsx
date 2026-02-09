"use client";

import { use } from "react";
import Link from "next/link";
import {
  Check,
  ArrowLeft,
  Edit,
  Users,
  TrendingUp,
  Heart,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// ── Data ──

const DIMENSIONS = [
  {
    icon: Users,
    color: "emerald",
    title: "Demographic Characteristics",
    insights: [
      "Tech-savvy founders aged 28-38 in major metro areas",
      "Bachelor's degree in Business, typically first-time founders",
      "Income range $80K-$150K, budget-conscious with brand investment",
    ],
  },
  {
    icon: TrendingUp,
    color: "blue",
    title: "Goals & Motivations",
    insights: [
      "Primary goal: build professional brand identity quickly",
      "Motivated by investor readiness and market positioning",
      "Values speed, independence, and cost-effectiveness",
    ],
  },
  {
    icon: Heart,
    color: "rose",
    title: "Challenges & Frustrations",
    insights: [
      "Agency costs ($15K+) and timelines (6-8 weeks) are prohibitive",
      "Tool fragmentation creates inconsistency across channels",
      "Difficulty maintaining brand consistency as team grows",
    ],
  },
  {
    icon: Zap,
    color: "amber",
    title: "Value Proposition",
    insights: [
      "All-in-one platform eliminates tool fragmentation",
      "AI-powered speed beats agency timelines by 10x",
      "Strategic guidance differentiates from design-only tools",
    ],
  },
];

// ── Component ──

export default function PersonaAnalysisCompletePage({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const { personaId } = use(params);

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-dark">AI Persona Analysis</h1>
            <Badge variant="success" size="sm" dot className="mt-0.5">Result</Badge>
          </div>
        </div>
      </div>

      {/* Green Completion Card */}
      <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-emerald-300">AI Persona Analysis Complete</h2>
        </div>
        <p className="text-sm text-emerald-300/60 mb-3">Generated based on 4 strategic dimensions</p>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-emerald-300">4</span>
            <span className="text-emerald-300/60 ml-1">dimensions</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-300">+35%</span>
            <span className="text-emerald-300/60 ml-1">research confidence</span>
          </div>
        </div>
      </div>

      {/* Generated Insights */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-text-dark">Generated Insights</h3>
        </div>
        <div className="space-y-5">
          {DIMENSIONS.map((dim) => {
            const Icon = dim.icon;
            const colorMap: Record<string, string> = {
              emerald: "bg-emerald-500/10 text-emerald-400",
              blue: "bg-blue-500/10 text-blue-400",
              rose: "bg-rose-500/10 text-rose-400",
              amber: "bg-amber-500/10 text-amber-400",
            };
            return (
              <div key={dim.title}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorMap[dim.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-text-dark">{dim.title}</h4>
                </div>
                <div className="ml-9 space-y-1.5">
                  {dim.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-dark/60">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border-dark">
        <Link
          href={`/knowledge/personas/${personaId}`}
          className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Persona
        </Link>
        <Button variant="primary" size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>
          Edit Answers
        </Button>
      </div>
    </div>
  );
}
