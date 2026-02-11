"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Pencil,
  Archive,
  Calendar,
  Clock,
  Target,
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  Megaphone,
  ArrowRight,
  DollarSign,
  Users,
  Star,
  Handshake,
  BarChart3,
  Link as LinkIcon,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/utils/date";
import {
  useStrategy,
  useUpdateStrategy,
  useCreateObjective,
  useUpdateObjective,
  useDeleteObjective,
  useCreateMilestone,
  useToggleMilestone,
  useDeleteMilestone,
  type ObjectiveData,
  type MilestoneData,
  type KeyResultData,
} from "@/hooks/api/useStrategies";
import { useToast } from "@/hooks/useToast";

// ────────────────────────────── Icon mapping ──────────────────────────────

const strategyIcons: Record<string, React.ReactNode> = {
  GROWTH: <TrendingUp className="w-6 h-6 text-primary" />,
  MARKET_ENTRY: <Users className="w-6 h-6 text-primary" />,
  PRODUCT_LAUNCH: <Star className="w-6 h-6 text-primary" />,
  BRAND_BUILDING: <Handshake className="w-6 h-6 text-primary" />,
  OPERATIONAL_EXCELLENCE: <BarChart3 className="w-6 h-6 text-primary" />,
  CUSTOM: <Target className="w-6 h-6 text-primary" />,
  // Legacy types
  "growth-strategy": <TrendingUp className="w-6 h-6 text-primary" />,
  growth: <TrendingUp className="w-6 h-6 text-primary" />,
  "target-audience": <Users className="w-6 h-6 text-primary" />,
  "competitive-landscape": <BarChart3 className="w-6 h-6 text-primary" />,
  "market-position": <Target className="w-6 h-6 text-primary" />,
};

const FOCUS_AREA_ICONS: Record<string, React.ReactNode> = {
  "Market Share": <BarChart3 className="w-5 h-5" />,
  "Revenue Growth": <DollarSign className="w-5 h-5" />,
  Revenue: <DollarSign className="w-5 h-5" />,
  "Customer Acquisition": <Users className="w-5 h-5" />,
  "Brand Awareness": <Star className="w-5 h-5" />,
  Partnerships: <Handshake className="w-5 h-5" />,
};

const FOCUS_AREA_OPTIONS = [
  { value: "Market Share", label: "Market Share" },
  { value: "Revenue Growth", label: "Revenue Growth" },
  { value: "Customer Acquisition", label: "Customer Acquisition" },
  { value: "Brand Awareness", label: "Brand Awareness" },
  { value: "Partnerships", label: "Partnerships" },
  { value: "Product Innovation", label: "Product Innovation" },
  { value: "Operational Excellence", label: "Operational Excellence" },
];

const PRIORITY_OPTIONS = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

// ────────────────────────────── Helpers ──────────────────────────────

function getObjectiveProgress(obj: ObjectiveData): number {
  if (obj.targetValue === obj.startValue) return 0;
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        ((obj.currentValue - obj.startValue) /
          (obj.targetValue - obj.startValue)) *
          100
      )
    )
  );
}

function formatMetricValue(
  value: number,
  metricType: string
): string {
  switch (metricType) {
    case "CURRENCY":
      return value >= 1000000
        ? `$${(value / 1000000).toFixed(1)}M`
        : value >= 1000
          ? `$${(value / 1000).toFixed(0)}K`
          : `$${value}`;
    case "PERCENTAGE":
      return `${value}%`;
    default:
      return String(value);
  }
}

function formatPeriod(start?: string | null, end?: string | null): string {
  if (!start && !end) return "2026";
  const s = start
    ? new Date(start).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";
  const e = end
    ? new Date(end).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function krStatusIcon(status: string) {
  const lower = status.toLowerCase();
  if (lower === "completed" || lower === "complete") {
    return <Check className="w-4 h-4 text-emerald-400" />;
  }
  if (lower === "behind" || lower === "at_risk") {
    return <div className="w-4 h-4 rounded-full bg-red-500" />;
  }
  return <div className="w-4 h-4 rounded-full border-2 border-text-dark/30" />;
}

function krStatusVariant(status: string): "complete" | "on-track" | "behind" {
  const lower = status.toLowerCase();
  if (lower === "completed" || lower === "complete") return "complete";
  if (lower === "behind" || lower === "at_risk") return "behind";
  return "on-track";
}

// ────────────────────────────── Linked Campaigns (placeholder) ──────────────────────

interface LinkedCampaign {
  id: string;
  name: string;
  status: "Active" | "Completed";
  deliverables: number;
  completion: number;
  targets: string[];
}

const LINKED_CAMPAIGNS: LinkedCampaign[] = [
  {
    id: "lc-1",
    name: "Brand Awareness Q1",
    status: "Active",
    deliverables: 8,
    completion: 85,
    targets: ["Brand Awareness"],
  },
  {
    id: "lc-2",
    name: "Enterprise Customer Push",
    status: "Active",
    deliverables: 12,
    completion: 45,
    targets: ["Market Share", "Revenue"],
  },
  {
    id: "lc-3",
    name: "Premium Tier Launch",
    status: "Completed",
    deliverables: 6,
    completion: 100,
    targets: ["Revenue Growth"],
  },
  {
    id: "lc-4",
    name: "Content Marketing Program",
    status: "Active",
    deliverables: 24,
    completion: 38,
    targets: ["Brand Awareness"],
  },
];

// ────────────────────────────── Component ──────────────────────────────

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { data: strategy, isLoading, isError } = useStrategy(id);

  // Mutations
  const updateStrategy = useUpdateStrategy();
  const createObjective = useCreateObjective(id);
  const updateObjective = useUpdateObjective(id);
  const deleteObjective = useDeleteObjective(id);
  const createMilestone = useCreateMilestone(id);
  const toggleMilestone = useToggleMilestone(id);
  const deleteMilestone = useDeleteMilestone(id);

  // UI state
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set()
  );
  const [expandAll, setExpandAll] = useState(true);
  const [showAddObjModal, setShowAddObjModal] = useState(false);
  const [showAddMsModal, setShowAddMsModal] = useState(false);
  const [editingContext, setEditingContext] = useState(false);

  // Context editing state
  const [editVision, setEditVision] = useState("");
  const [editRationale, setEditRationale] = useState("");
  const [editAssumptions, setEditAssumptions] = useState("");

  // Add Objective modal state
  const [newObjTitle, setNewObjTitle] = useState("");
  const [newObjDesc, setNewObjDesc] = useState("");
  const [newObjFocus, setNewObjFocus] = useState("");
  const [newObjPriority, setNewObjPriority] = useState("MEDIUM");
  const [newObjMetricType, setNewObjMetricType] = useState("PERCENTAGE");
  const [newObjStart, setNewObjStart] = useState("");
  const [newObjTarget, setNewObjTarget] = useState("");
  const [newObjCurrent, setNewObjCurrent] = useState("");
  const [newKRs, setNewKRs] = useState<string[]>([""]);

  // Add Milestone modal state
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDesc, setNewMsDesc] = useState("");
  const [newMsDate, setNewMsDate] = useState("");
  const [newMsQuarter, setNewMsQuarter] = useState("");

  // Initialize expanded objectives when data loads
  const objectives = strategy?.objectives ?? [];
  if (expandAll && objectives.length > 0 && expandedObjectives.size === 0) {
    const allIds = new Set(objectives.map((o) => o.id));
    if (allIds.size > 0 && expandedObjectives.size !== allIds.size) {
      setExpandedObjectives(allIds);
    }
  }

  const toggleObjective = useCallback((objId: string) => {
    setExpandedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objId)) next.delete(objId);
      else next.add(objId);
      return next;
    });
  }, []);

  // ─── Handlers ────────────────────────────────────────

  const handleAddObjective = () => {
    if (!newObjTitle.trim()) return;

    createObjective.mutate(
      {
        title: newObjTitle.trim(),
        description: newObjDesc.trim() || undefined,
        focusArea: newObjFocus || undefined,
        priority: newObjPriority,
        metricType: newObjMetricType,
        startValue: newObjStart || "0",
        targetValue: newObjTarget || "100",
        currentValue: newObjCurrent || "0",
        keyResults: newKRs.filter((kr) => kr.trim()),
      },
      {
        onSuccess: () => {
          toast.success("Objective added");
          setShowAddObjModal(false);
          resetObjModal();
        },
        onError: () => toast.error("Failed to add objective"),
      }
    );
  };

  const resetObjModal = () => {
    setNewObjTitle("");
    setNewObjDesc("");
    setNewObjFocus("");
    setNewObjPriority("MEDIUM");
    setNewObjMetricType("PERCENTAGE");
    setNewObjStart("");
    setNewObjTarget("");
    setNewObjCurrent("");
    setNewKRs([""]);
  };

  const handleDeleteObjective = (objectiveId: string) => {
    deleteObjective.mutate(objectiveId, {
      onSuccess: () => toast.success("Objective deleted"),
      onError: () => toast.error("Failed to delete objective"),
    });
  };

  const handleAddMilestone = () => {
    if (!newMsTitle.trim() || !newMsDate) return;

    createMilestone.mutate(
      {
        title: newMsTitle.trim(),
        description: newMsDesc.trim() || undefined,
        dueDate: newMsDate,
        quarter: newMsQuarter || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Milestone added");
          setShowAddMsModal(false);
          setNewMsTitle("");
          setNewMsDesc("");
          setNewMsDate("");
          setNewMsQuarter("");
        },
        onError: () => toast.error("Failed to add milestone"),
      }
    );
  };

  const handleToggleMilestone = (ms: MilestoneData) => {
    toggleMilestone.mutate(
      { milestoneId: ms.id, completed: !ms.completed },
      {
        onError: () => toast.error("Failed to update milestone"),
      }
    );
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    deleteMilestone.mutate(milestoneId, {
      onSuccess: () => toast.success("Milestone deleted"),
      onError: () => toast.error("Failed to delete milestone"),
    });
  };

  const startEditContext = () => {
    if (!strategy) return;
    setEditVision(strategy.vision || "");
    setEditRationale(strategy.rationale || "");
    setEditAssumptions((strategy.assumptions ?? []).join("\n"));
    setEditingContext(true);
  };

  const saveContext = () => {
    if (!strategy) return;
    const assumptions = editAssumptions
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    updateStrategy.mutate(
      {
        strategyId: strategy.id,
        vision: editVision.trim() || undefined,
        rationale: editRationale.trim() || undefined,
        assumptions: assumptions.length > 0 ? assumptions : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Strategic context updated");
          setEditingContext(false);
        },
        onError: () => toast.error("Failed to update context"),
      }
    );
  };

  // ─── Loading / Error states ────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-[1000px]">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-surface-dark rounded w-1/4" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-surface-dark" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-surface-dark rounded w-1/3" />
              <div className="h-4 bg-surface-dark rounded w-1/2" />
            </div>
          </div>
          <div className="h-48 bg-surface-dark rounded" />
          <div className="h-64 bg-surface-dark rounded" />
        </div>
      </div>
    );
  }

  if (isError || !strategy) {
    return (
      <div className="max-w-[1000px]">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Strategy not found
          </h2>
          <p className="text-text-dark/60 mb-4">
            The strategy you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/knowledge/business-strategy")}
          >
            Back to Business Strategy
          </Button>
        </div>
      </div>
    );
  }

  // ─── Derived data ────────────────────────────────────

  const milestones = strategy.milestones ?? [];
  const focusAreas = (strategy.focusAreas ?? []) as string[];
  const vision = strategy.vision || strategy.description || "";
  const rationale = strategy.rationale || "";
  const assumptions = strategy.assumptions ?? [];
  const icon =
    strategyIcons[strategy.type] || (
      <TrendingUp className="w-6 h-6 text-primary" />
    );
  const isActive = strategy.status.toLowerCase() === "active";
  const period = formatPeriod(strategy.startDate, strategy.endDate);

  const onTrackCount = objectives.filter(
    (o) => o.status === "ON_TRACK" || o.status === "COMPLETED"
  ).length;
  const atRiskCount = objectives.filter(
    (o) => o.status === "AT_RISK"
  ).length;
  const overallProgress =
    objectives.length > 0
      ? Math.round(
          objectives.reduce((s, o) => s + getObjectiveProgress(o), 0) /
            objectives.length
        )
      : 0;

  // Focus areas with objective counts and descriptions
  const FOCUS_AREA_DESCRIPTIONS: Record<string, string> = {
    "Market Share": "Primary focus on expanding market presence",
    "Revenue Growth": "Grow ARR through upselling and new customers",
    Revenue: "Grow ARR through upselling and new customers",
    "Customer Acquisition": "Scale acquisition through digital channels",
    "Brand Awareness": "Increase market recognition and thought leadership",
    Partnerships: "Build strategic alliances for market expansion",
    "Product Innovation": "Develop new products and features",
    "Operational Excellence": "Optimize processes and efficiency",
  };

  const focusAreaCounts = focusAreas.map((area) => ({
    label: area,
    icon: FOCUS_AREA_ICONS[area] || <Target className="w-5 h-5" />,
    count: objectives.filter((o) => o.focusArea === area).length,
    description: FOCUS_AREA_DESCRIPTIONS[area] || `Focus on ${area.toLowerCase()}`,
  }));

  return (
    <div className="max-w-[1000px]">
      {/* Back link */}
      <Link
        href="/knowledge/business-strategy"
        className="inline-flex items-center gap-1.5 text-sm text-text-dark/50 hover:text-text-dark mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Business Strategy
      </Link>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {strategy.icon ? (
              <span className="text-2xl">{strategy.icon}</span>
            ) : (
              icon
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-dark">
              {strategy.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant={isActive ? "success" : "default"} size="sm" dot>
                {isActive ? "Active" : strategy.status}
              </Badge>
              <span className="text-xs text-text-dark/40 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {period}
              </span>
              <span className="text-xs text-text-dark/40 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated: {formatDistanceToNow(strategy.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Archive className="w-3.5 h-3.5" />}
          >
            Archive
          </Button>
        </div>
      </div>

      {/* Strategy Progress */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-text-dark">
            Strategy Progress
          </h2>
        </div>
        {objectives.length > 0 ? (
          <>
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-3 rounded-full bg-border-dark/30 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{
                      width: `${(onTrackCount / objectives.length) * overallProgress}%`,
                    }}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{
                      width: `${(atRiskCount / objectives.length) * overallProgress}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-text-dark w-10 text-right">
                  {overallProgress}%
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-dark/50">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  On Track
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  At Risk
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-border-dark/50" />
                  Remaining
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border-dark">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-dark">
                  {objectives.length}
                </p>
                <p className="text-xs text-text-dark/40">Total Objectives</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {onTrackCount}
                </p>
                <p className="text-xs text-text-dark/40">On Track</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">
                  {atRiskCount}
                </p>
                <p className="text-xs text-text-dark/40">At Risk</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-dark/40 py-4 text-center">
            No objectives yet. Add your first objective to track progress.
          </p>
        )}
      </Card>

      {/* Strategic Context */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">
              Strategic Context
            </h2>
          </div>
          {editingContext ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingContext(false)}
                className="p-1.5 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={saveContext}
                className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEditContext}
              className="text-text-dark/40 hover:text-text-dark transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1.5">
              Vision for this Strategy
            </p>
            {editingContext ? (
              <textarea
                value={editVision}
                onChange={(e) => setEditVision(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe the vision..."
              />
            ) : (
              <p className="text-sm text-text-dark/70 leading-relaxed">
                {vision || "No vision set yet."}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1.5">
              Strategic Rationale
            </p>
            {editingContext ? (
              <textarea
                value={editRationale}
                onChange={(e) => setEditRationale(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Explain the rationale..."
              />
            ) : (
              <p className="text-sm text-text-dark/70 leading-relaxed">
                {rationale || "No rationale set yet."}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1.5">
              Key Assumptions
            </p>
            {editingContext ? (
              <textarea
                value={editAssumptions}
                onChange={(e) => setEditAssumptions(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="One assumption per line..."
              />
            ) : assumptions.length > 0 ? (
              <ul className="space-y-1.5">
                {assumptions.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-dark/70"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-dark/40">
                No assumptions set yet.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Strategic Objectives */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">
              Strategic Objectives
            </h2>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowAddObjModal(true)}
          >
            Add Objective
          </Button>
        </div>

        {objectives.length === 0 ? (
          <Card padding="lg">
            <p className="text-sm text-text-dark/40 text-center py-6">
              No objectives yet. Click &quot;Add Objective&quot; to define your
              first strategic objective.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {objectives.map((obj, idx) => {
              const isExpanded = expandedObjectives.has(obj.id);
              const progress = getObjectiveProgress(obj);
              const objStatus =
                obj.status === "ON_TRACK" || obj.status === "COMPLETED"
                  ? "on-track"
                  : "at-risk";

              return (
                <Card key={obj.id} padding="none">
                  {/* Header */}
                  <button
                    onClick={() => toggleObjective(obj.id)}
                    className="w-full flex items-start gap-3 px-5 py-4 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-dark/40 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-dark/40 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-text-dark/40">
                          #{idx + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-text-dark">
                          {obj.title}
                        </h3>
                        <Badge
                          variant={
                            objStatus === "on-track" ? "success" : "warning"
                          }
                          size="sm"
                          dot
                        >
                          {objStatus === "on-track" ? "On Track" : "At Risk"}
                        </Badge>
                        {obj.priority === "HIGH" && (
                          <Badge variant="error" size="sm">
                            High Priority
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-dark/40 mt-1 line-clamp-1">
                        {obj.description || "No description"}
                      </p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-4 border-t border-border-dark pt-4 ml-7">
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={progress}
                          size="sm"
                          variant={
                            objStatus === "on-track" ? "default" : "warning"
                          }
                          className="flex-1"
                        />
                        <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                          {progress}%
                        </span>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">
                            Target
                          </p>
                          <p className="text-sm font-semibold text-text-dark">
                            {formatMetricValue(
                              obj.targetValue,
                              obj.metricType
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">
                            Current
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            {formatMetricValue(
                              obj.currentValue,
                              obj.metricType
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">
                            Start
                          </p>
                          <p className="text-sm font-semibold text-text-dark/50">
                            {formatMetricValue(
                              obj.startValue,
                              obj.metricType
                            )}
                          </p>
                        </div>
                        {obj.focusArea && (
                          <div>
                            <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">
                              Focus Area
                            </p>
                            <Badge variant="default" size="sm">
                              {obj.focusArea}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Key Results */}
                      {obj.keyResults && obj.keyResults.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">
                            Key Results
                          </p>
                          <div className="space-y-1.5">
                            {obj.keyResults.map((kr: KeyResultData) => {
                              const variant = krStatusVariant(kr.status);
                              return (
                                <div
                                  key={kr.id}
                                  className="flex items-center gap-2.5"
                                >
                                  {krStatusIcon(kr.status)}
                                  <span
                                    className={cn(
                                      "text-sm flex-1",
                                      variant === "complete"
                                        ? "text-text-dark/50"
                                        : "text-text-dark"
                                    )}
                                  >
                                    {kr.description}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-xs font-medium",
                                      variant === "complete"
                                        ? "text-emerald-400"
                                        : variant === "behind"
                                          ? "text-red-400"
                                          : "text-text-dark/60"
                                    )}
                                  >
                                    {kr.currentValue || kr.targetValue || "–"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border-dark/50">
                        <div className="flex items-center gap-2">
                          {obj.status !== "COMPLETED" && (
                            <button
                              onClick={() =>
                                updateObjective.mutate(
                                  {
                                    objectiveId: obj.id,
                                    status:
                                      obj.status === "ON_TRACK"
                                        ? "AT_RISK"
                                        : "ON_TRACK",
                                  },
                                  {
                                    onError: () =>
                                      toast.error(
                                        "Failed to update status"
                                      ),
                                  }
                                )
                              }
                              className="text-xs text-text-dark/50 hover:text-text-dark transition-colors"
                            >
                              Mark as{" "}
                              {obj.status === "ON_TRACK"
                                ? "At Risk"
                                : "On Track"}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteObjective(obj.id)}
                          className="text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Key Focus Areas */}
      {focusAreas.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-text-dark">
                Key Focus Areas
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {focusAreaCounts.map((area) => (
              <Card key={area.label} hoverable padding="md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {area.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-dark">
                      {area.label}
                    </p>
                    <p className="text-xs text-text-dark/40 mt-0.5">
                      {area.description}
                    </p>
                    <p className="text-xs text-text-dark/30 mt-1">
                      {area.count} Objective{area.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Linked Campaigns (placeholder) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">
              Linked Campaigns
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Link Campaign
          </Button>
        </div>
        <p className="text-xs text-text-dark/40 mb-4">
          Campaigns executing this strategy
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LINKED_CAMPAIGNS.map((campaign) => (
            <Card key={campaign.id} hoverable padding="md">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-dark">
                    {campaign.name}
                  </h3>
                  <Badge
                    variant={
                      campaign.status === "Completed" ? "success" : "info"
                    }
                    size="sm"
                    dot
                  >
                    {campaign.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-dark/40">
                  <span>{campaign.deliverables} deliverables</span>
                  <span>{campaign.completion}% complete</span>
                </div>
                <ProgressBar
                  value={campaign.completion}
                  size="sm"
                  variant={campaign.completion === 100 ? "success" : "default"}
                />
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {campaign.targets.map((t) => (
                      <Badge key={t} variant="default" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-0.5 transition-colors">
                    View <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Key Milestones */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">
              Key Milestones
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowAddMsModal(true)}
          >
            Add Milestone
          </Button>
        </div>

        {milestones.length === 0 ? (
          <Card padding="lg">
            <p className="text-sm text-text-dark/40 text-center py-4">
              No milestones yet. Add milestones to track key dates.
            </p>
          </Card>
        ) : (
          <Card padding="lg">
            {/* Quarter labels */}
            {milestones.some((ms) => ms.quarter) && (
              <div className="flex items-center mb-6">
                {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <div key={q} className="flex-1 text-center">
                    <span className="text-xs font-medium text-text-dark/40">
                      {q} 2026
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline line with dots */}
            {milestones.length <= 8 && (
              <div className="relative h-8 mb-4">
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border-dark -translate-y-1/2" />
                {milestones.map((ms, i) => (
                  <div
                    key={ms.id}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                      left: `${((i + 0.5) / milestones.length) * 100}%`,
                    }}
                  >
                    <button
                      onClick={() => handleToggleMilestone(ms)}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 -translate-x-1/2 transition-colors",
                        ms.completed
                          ? "bg-primary border-primary"
                          : "bg-surface-dark border-amber-400 hover:border-primary"
                      )}
                    >
                      {ms.completed && (
                        <Check className="w-2.5 h-2.5 text-white m-auto mt-[1px]" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Milestone cards */}
            <div
              className={cn(
                "grid gap-3",
                milestones.length <= 4
                  ? "grid-cols-2 lg:grid-cols-4"
                  : "grid-cols-2 lg:grid-cols-3"
              )}
            >
              {milestones.map((ms) => (
                <div
                  key={ms.id}
                  className={cn(
                    "p-3 rounded-lg border text-center relative group",
                    ms.completed
                      ? "border-primary/20 bg-primary/5"
                      : "border-border-dark"
                  )}
                >
                  <button
                    onClick={() => handleDeleteMilestone(ms.id)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded text-text-dark/30 hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-xs font-semibold text-text-dark">
                    {ms.title}
                  </p>
                  <p className="text-[10px] text-text-dark/40 mt-0.5">
                    {new Date(ms.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => handleToggleMilestone(ms)}
                    className="mt-1.5"
                  >
                    <Badge
                      variant={ms.completed ? "success" : "default"}
                      size="sm"
                    >
                      {ms.completed ? "Done" : "Upcoming"}
                    </Badge>
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ─── Add Objective Modal ─── */}
      <Modal
        open={showAddObjModal}
        onClose={() => {
          setShowAddObjModal(false);
          resetObjModal();
        }}
        title="Add Strategic Objective"
        description="Define a measurable objective for this strategy"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Objective Title *"
            value={newObjTitle}
            onChange={(e) => setNewObjTitle(e.target.value)}
            placeholder="e.g. Increase Market Share"
          />
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Description
            </label>
            <textarea
              value={newObjDesc}
              onChange={(e) => setNewObjDesc(e.target.value)}
              placeholder="Describe the objective and expected outcome..."
              rows={3}
              className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background-dark"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Focus Area"
              options={FOCUS_AREA_OPTIONS}
              value={newObjFocus}
              onChange={setNewObjFocus}
              placeholder="Select area..."
            />
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={newObjPriority}
              onChange={setNewObjPriority}
            />
          </div>

          {/* Metric Type */}
          <div>
            <p className="text-sm font-medium text-text-dark mb-2">
              Metric Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "PERCENTAGE", label: "Percentage" },
                { value: "NUMBER", label: "Number" },
                { value: "CURRENCY", label: "Currency" },
              ].map((mt) => (
                <button
                  key={mt.value}
                  onClick={() => setNewObjMetricType(mt.value)}
                  className={cn(
                    "p-2 rounded-lg border text-sm font-medium text-center transition-colors",
                    newObjMetricType === mt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border-dark text-text-dark/60 hover:bg-surface-dark"
                  )}
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric values */}
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Starting Value"
              value={newObjStart}
              onChange={(e) => setNewObjStart(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Target Value"
              value={newObjTarget}
              onChange={(e) => setNewObjTarget(e.target.value)}
              placeholder="100"
            />
            <Input
              label="Current Value"
              value={newObjCurrent}
              onChange={(e) => setNewObjCurrent(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Key Results */}
          <div>
            <p className="text-sm font-medium text-text-dark mb-2">
              Key Results
            </p>
            <div className="space-y-2">
              {newKRs.map((kr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={kr}
                    onChange={(e) => {
                      const updated = [...newKRs];
                      updated[i] = e.target.value;
                      setNewKRs(updated);
                    }}
                    placeholder={`Key result ${i + 1}`}
                    className="flex-1"
                  />
                  {newKRs.length > 1 && (
                    <button
                      onClick={() =>
                        setNewKRs(newKRs.filter((_, j) => j !== i))
                      }
                      className="p-2 rounded-md text-text-dark/30 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {i === newKRs.length - 1 && (
                    <button
                      onClick={() => setNewKRs([...newKRs, ""])}
                      className="p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddObjModal(false);
                resetObjModal();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!newObjTitle.trim() || createObjective.isPending}
              onClick={handleAddObjective}
            >
              {createObjective.isPending ? "Adding..." : "Add Objective"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Add Milestone Modal ─── */}
      <Modal
        open={showAddMsModal}
        onClose={() => setShowAddMsModal(false)}
        title="Add Milestone"
        description="Set a key date for this strategy"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Milestone Title *"
            value={newMsTitle}
            onChange={(e) => setNewMsTitle(e.target.value)}
            placeholder="e.g. Mid-Year Review"
          />
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Description
            </label>
            <textarea
              value={newMsDesc}
              onChange={(e) => setNewMsDesc(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full rounded-md border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date *"
              type="date"
              value={newMsDate}
              onChange={(e) => setNewMsDate(e.target.value)}
            />
            <Select
              label="Quarter"
              options={[
                { value: "Q1", label: "Q1" },
                { value: "Q2", label: "Q2" },
                { value: "Q3", label: "Q3" },
                { value: "Q4", label: "Q4" },
              ]}
              value={newMsQuarter}
              onChange={setNewMsQuarter}
              placeholder="Select..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddMsModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={
                !newMsTitle.trim() || !newMsDate || createMilestone.isPending
              }
              onClick={handleAddMilestone}
            >
              {createMilestone.isPending ? "Adding..." : "Add Milestone"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Small helper component to avoid using actual emoji in component icon
function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
