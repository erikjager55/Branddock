"use client";

import {
  Plus,
  Target,
  Calendar,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

const kpis = [
  {
    label: "Brand Awareness",
    value: "45.2K",
    change: "+12.3%",
    trend: "up",
    icon: Eye,
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    label: "Engagement Rate",
    value: "8.7%",
    change: "+2.1%",
    trend: "up",
    icon: MousePointerClick,
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    label: "Lead Generation",
    value: "1,234",
    change: "+18.5%",
    trend: "up",
    icon: Users,
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    label: "Revenue Impact",
    value: "$52.8K",
    change: "+8.2%",
    trend: "up",
    icon: DollarSign,
    color: "bg-amber-500/10 text-amber-400",
  },
];

const goals = [
  {
    id: "1",
    title: "Increase Brand Awareness by 50%",
    target: 50000,
    current: 32500,
    unit: "impressions",
    deadline: "Mar 31, 2025",
    status: "on-track",
  },
  {
    id: "2",
    title: "Achieve 10% Engagement Rate",
    target: 10,
    current: 8.7,
    unit: "%",
    deadline: "Jun 30, 2025",
    status: "on-track",
  },
  {
    id: "3",
    title: "Generate 2,000 Qualified Leads",
    target: 2000,
    current: 1234,
    unit: "leads",
    deadline: "Dec 31, 2025",
    status: "on-track",
  },
  {
    id: "4",
    title: "Publish 50 Content Pieces",
    target: 50,
    current: 18,
    unit: "pieces",
    deadline: "Dec 31, 2025",
    status: "behind",
  },
];

const goalStatusConfig: Record<string, { label: string; variant: "success" | "warning" | "info" }> = {
  "on-track": { label: "On Track", variant: "success" },
  behind: { label: "Behind", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
};

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export default function GoalsPage() {
  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Goals & KPIs
          </h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Add Goal
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Track your brand performance and strategic objectives
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} padding="lg">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpi.color.split(" ")[0]}`}
                >
                  <Icon
                    className={`w-5 h-5 ${kpi.color.split(" ")[1]}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-text-dark">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-text-dark/40">{kpi.label}</p>
                </div>
                <Badge variant="success" size="sm">
                  {kpi.change}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Goals */}
      <h2 className="text-lg font-semibold text-text-dark mb-4">
        Strategic Goals
      </h2>
      <div className="space-y-3">
        {goals.map((goal) => {
          const progress = Math.round((goal.current / goal.target) * 100);
          const config = goalStatusConfig[goal.status];
          return (
            <Card key={goal.id} hoverable padding="lg">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-dark">
                        {goal.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-dark/40">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Deadline: {goal.deadline}
                        </span>
                      </div>
                    </div>
                    <Badge variant={config.variant} size="sm" dot>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <ProgressBar
                        value={progress}
                        size="sm"
                        variant={progress >= 100 ? "success" : "default"}
                      />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-semibold text-text-dark">
                        {formatValue(goal.current, goal.unit)}
                      </span>
                      <span className="text-xs text-text-dark/40">
                        {" "}/ {formatValue(goal.target, goal.unit)}
                      </span>
                    </div>
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
