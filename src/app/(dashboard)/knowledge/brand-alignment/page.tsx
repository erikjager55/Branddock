"use client";

import { Shield, RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const overallScore = 78;

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "error"; icon: typeof CheckCircle }> = {
  aligned: { label: "Aligned", variant: "success", icon: CheckCircle },
  review: { label: "Needs Review", variant: "warning", icon: AlertTriangle },
  outdated: { label: "Outdated", variant: "error", icon: AlertTriangle },
};

const brandAssets = [
  {
    name: "Mission Statement",
    score: 92,
    status: "aligned",
    lastChecked: "Feb 5, 2025",
  },
  {
    name: "Vision",
    score: 88,
    status: "aligned",
    lastChecked: "Feb 5, 2025",
  },
  {
    name: "Brand Values",
    score: 85,
    status: "aligned",
    lastChecked: "Feb 3, 2025",
  },
  {
    name: "Brand Voice",
    score: 72,
    status: "review",
    lastChecked: "Jan 28, 2025",
  },
  {
    name: "Visual Identity",
    score: 68,
    status: "review",
    lastChecked: "Jan 25, 2025",
  },
  {
    name: "Personas",
    score: 80,
    status: "aligned",
    lastChecked: "Feb 1, 2025",
  },
  {
    name: "Product Positioning",
    score: 55,
    status: "outdated",
    lastChecked: "Dec 15, 2024",
  },
  {
    name: "Competitive Differentiation",
    score: 74,
    status: "review",
    lastChecked: "Jan 20, 2025",
  },
];

function ScoreCircle({ score }: { score: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "text-emerald-400"
      : score >= 60
        ? "text-amber-400"
        : "text-red-400";
  const strokeColor =
    score >= 80
      ? "stroke-emerald-400"
      : score >= 60
        ? "stroke-amber-400"
        : "stroke-red-400";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border-dark/30"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={strokeColor}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-text-dark/40">/ 100</span>
      </div>
    </div>
  );
}

function MiniScoreBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-400"
      : score >= 60
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <div className="flex items-center gap-2 w-32">
      <div className="flex-1 h-1.5 rounded-full bg-border-dark/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${score}%`, transition: "width 0.5s ease-out" }}
        />
      </div>
      <span className="text-xs font-medium text-text-dark w-7 text-right">
        {score}
      </span>
    </div>
  );
}

export default function BrandAlignmentPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Brand Alignment
          </h1>
          <Button
            variant="primary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Run Alignment Check
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Monitor how well your brand assets align with your strategy
        </p>
      </div>

      {/* Overall Score */}
      <Card padding="lg" className="mb-8">
        <div className="flex items-center gap-8">
          <ScoreCircle score={overallScore} />
          <div>
            <h3 className="text-lg font-semibold text-text-dark mb-1">
              Overall Alignment Score
            </h3>
            <p className="text-sm text-text-dark/40 mb-3">
              Your brand assets are mostly aligned. Focus on Product Positioning
              and Visual Identity to improve your score.
            </p>
            <div className="flex items-center gap-4 text-xs text-text-dark/40">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                4 Aligned
              </span>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                3 Needs Review
              </span>
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                1 Outdated
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Brand Asset Scores */}
      <div className="space-y-2">
        {brandAssets.map((asset) => {
          const config = statusConfig[asset.status];
          const StatusIcon = config.icon;
          return (
            <Card key={asset.name} hoverable padding="md">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-dark">
                    {asset.name}
                  </h3>
                </div>
                <MiniScoreBar score={asset.score} />
                <Badge variant={config.variant} size="sm" dot>
                  {config.label}
                </Badge>
                <span className="flex items-center gap-1.5 text-xs text-text-dark/40 w-32 justify-end">
                  <Clock className="w-3.5 h-3.5" />
                  {asset.lastChecked}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
