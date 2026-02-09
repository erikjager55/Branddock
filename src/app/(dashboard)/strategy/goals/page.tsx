"use client";

import { useState } from "react";
import {
  Plus,
  Target,
  Calendar,
  Eye,
  MousePointerClick,
  Users,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useGoals, useCreateGoal, Goal } from "@/hooks/api/useGoals";
import { useToast } from "@/hooks/useToast";
import { DemoBanner } from "@/components/ui/DemoBanner";

const kpis = [
  { label: "Brand Awareness", value: "45.2K", change: "+12.3%", icon: Eye, color: "bg-blue-500/10 text-blue-400" },
  { label: "Engagement Rate", value: "8.7%", change: "+2.1%", icon: MousePointerClick, color: "bg-emerald-500/10 text-emerald-400" },
  { label: "Lead Generation", value: "1,234", change: "+18.5%", icon: Users, color: "bg-violet-500/10 text-violet-400" },
  { label: "Revenue Impact", value: "$52.8K", change: "+8.2%", icon: DollarSign, color: "bg-amber-500/10 text-amber-400" },
];

const placeholderGoals: Goal[] = [
  { id: "1", title: "Increase Brand Awareness by 50%", targetValue: 50000, currentValue: 32500, unit: "impressions", deadline: "2025-03-31T00:00:00.000Z", status: "ON_TRACK", workspaceId: "mock", createdById: "mock", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" } },
  { id: "2", title: "Achieve 10% Engagement Rate", targetValue: 10, currentValue: 8.7, unit: "%", deadline: "2025-06-30T00:00:00.000Z", status: "ON_TRACK", workspaceId: "mock", createdById: "mock", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" } },
  { id: "3", title: "Generate 2,000 Qualified Leads", targetValue: 2000, currentValue: 1234, unit: "leads", deadline: "2025-12-31T00:00:00.000Z", status: "ON_TRACK", workspaceId: "mock", createdById: "mock", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" } },
  { id: "4", title: "Publish 50 Content Pieces", targetValue: 50, currentValue: 18, unit: "pieces", deadline: "2025-12-31T00:00:00.000Z", status: "BEHIND", workspaceId: "mock", createdById: "mock", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z", createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" } },
];

const goalStatusConfig: Record<string, { label: string; variant: "success" | "warning" | "info" }> = {
  ON_TRACK: { label: "On Track", variant: "success" },
  BEHIND: { label: "Behind", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "info" },
};

function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GoalsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formUnit, setFormUnit] = useState("");

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = useGoals({ workspaceId });
  const createGoal = useCreateGoal();
  const toast = useToast();

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const goals = hasApiData ? apiData!.data : placeholderGoals;
  const isDemo = !isLoading && !hasApiData;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createGoal.mutate(
      { title: formTitle, targetValue: Number(formTarget), unit: formUnit, workspaceId },
      {
        onSuccess: () => {
          toast.success("Goal created", "Your goal has been created.");
          setFormTitle("");
          setFormTarget("");
          setFormUnit("");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to create goal", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Goals & KPIs</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
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
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpi.color.split(" ")[0]}`}>
                  <Icon className={`w-5 h-5 ${kpi.color.split(" ")[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-text-dark">{kpi.value}</p>
                  <p className="text-xs text-text-dark/40">{kpi.label}</p>
                </div>
                <Badge variant="success" size="sm">{kpi.change}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

      {/* Goals */}
      <h2 className="text-lg font-semibold text-text-dark mb-4">Strategic Goals</h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={100} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-8 h-8" />}
          title="No goals yet"
          description="Add your first strategic goal to track progress"
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Goal
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = Math.round((goal.currentValue / goal.targetValue) * 100);
            const config = goalStatusConfig[goal.status] || goalStatusConfig.ON_TRACK;
            return (
              <Card key={goal.id} hoverable padding="lg">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-dark">{goal.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-dark/40">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Deadline: {formatDate(goal.deadline)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={config.variant} size="sm" dot>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <ProgressBar value={progress} size="sm" variant={progress >= 100 ? "success" : "default"} />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-semibold text-text-dark">{formatValue(goal.currentValue, goal.unit)}</span>
                        <span className="text-xs text-text-dark/40"> / {formatValue(goal.targetValue, goal.unit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Goal Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Goal">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Title *</label>
            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Increase Brand Awareness by 50%" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Target Value *</label>
            <Input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="e.g. 50000" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Unit *</label>
            <Input value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="e.g. impressions, %, leads" required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createGoal.isPending}>
              {createGoal.isPending ? "Creating..." : "Add Goal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
