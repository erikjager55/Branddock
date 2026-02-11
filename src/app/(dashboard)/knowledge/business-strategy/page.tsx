"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, ChevronRight, Calendar, Briefcase } from "lucide-react";
import {
  useStrategies,
  useCreateStrategy,
  BusinessStrategy,
} from "@/hooks/api/useStrategies";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/utils/date";

const STRATEGY_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  GROWTH: { icon: "📈", label: "Growth" },
  MARKET_ENTRY: { icon: "🌍", label: "Market Entry" },
  PRODUCT_LAUNCH: { icon: "🚀", label: "Product Launch" },
  BRAND_BUILDING: { icon: "🎨", label: "Brand Building" },
  OPERATIONAL_EXCELLENCE: { icon: "⚙️", label: "Operational Excellence" },
  CUSTOM: { icon: "🔧", label: "Custom" },
  // Legacy types
  "growth-strategy": { icon: "📈", label: "Growth" },
  "competitive-analysis": { icon: "🏆", label: "Competitive Analysis" },
  "target-audience": { icon: "👥", label: "Target Audience" },
  "market-position": { icon: "📍", label: "Market Position" },
};

function getStrategyIcon(type: string, icon?: string | null): string {
  if (icon) return icon;
  return STRATEGY_TYPE_CONFIG[type]?.icon ?? "🎯";
}

function formatPeriod(start?: string | null, end?: string | null): string {
  if (!start && !end) return "";
  const s = start ? new Date(start).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  const e = end ? new Date(end).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
  if (s && e) return `${s} - ${e}`;
  return s || e;
}

export default function BusinessStrategyPage() {
  const { data: apiData, isLoading } = useStrategies({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const strategies = (apiData?.data ?? []) as BusinessStrategy[];

  // Summary stats computed from all strategies
  const stats = useMemo(() => {
    const activeStrategies = strategies.filter(
      (s) => s.status.toLowerCase() === "active"
    );
    let onTrack = 0;
    let atRisk = 0;
    for (const s of strategies) {
      for (const obj of s.objectives ?? []) {
        if (obj.status === "ON_TRACK" || obj.status === "COMPLETED") onTrack++;
        if (obj.status === "AT_RISK") atRisk++;
      }
    }
    // Current planning period
    const now = new Date();
    const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
    return {
      activeCount: activeStrategies.length,
      onTrack,
      atRisk,
      period: quarter,
    };
  }, [strategies]);

  return (
    <div className="max-w-[1200px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h1 className="text-2xl font-semibold text-text-dark">
                Business Strategy
              </h1>
              <p className="text-sm text-text-dark/60">
                Define and track your strategic business objectives
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Strategy
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-teal-400">{stats.activeCount}</p>
          <p className="text-xs text-text-dark/60 mt-0.5 flex items-center gap-1">
            <span>📊</span> Active Strategies
          </p>
        </div>
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.onTrack}</p>
          <p className="text-xs text-text-dark/60 mt-0.5 flex items-center gap-1">
            <span>✅</span> Objectives On Track
          </p>
        </div>
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{stats.atRisk}</p>
          <p className="text-xs text-text-dark/60 mt-0.5 flex items-center gap-1">
            <span>⚠️</span> At Risk Objectives
          </p>
        </div>
        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-text-dark">{stats.period}</p>
          <p className="text-xs text-text-dark/60 mt-0.5 flex items-center gap-1">
            <span>📅</span> Current Period
          </p>
        </div>
      </div>

      {/* Strategy Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={180} />
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No strategies yet"
          description="Create your first business strategy to start tracking objectives"
          action={
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Add Strategy
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </div>
      )}

      {/* Create Strategy Modal */}
      <CreateStrategyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: BusinessStrategy }) {
  const objectives = strategy.objectives ?? [];
  const onTrack = objectives.filter(
    (o) => o.status === "ON_TRACK" || o.status === "COMPLETED"
  ).length;
  const atRisk = objectives.filter((o) => o.status === "AT_RISK").length;
  const total = objectives.length;
  const progressPct =
    total > 0 ? Math.round((onTrack / total) * 100) : 0;
  const onTrackPct = total > 0 ? (onTrack / total) * 100 : 0;
  const atRiskPct = total > 0 ? (atRisk / total) * 100 : 0;
  const isActive = strategy.status.toLowerCase() === "active";
  const focusAreas = (strategy.focusAreas ?? []) as string[];
  const period = formatPeriod(strategy.startDate, strategy.endDate);

  return (
    <Link href={`/knowledge/business-strategy/${strategy.id}`}>
      <Card hoverable padding="lg" className="group">
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">
            {getStrategyIcon(strategy.type, strategy.icon)}
          </span>
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title row */}
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-dark truncate">
                {strategy.title}
              </h3>
              <Badge
                variant={isActive ? "success" : "default"}
                size="sm"
                dot
              >
                {isActive ? "Active" : strategy.status}
              </Badge>
              <ChevronRight className="w-4 h-4 text-text-dark/30 ml-auto group-hover:text-text-dark/60 transition-colors flex-shrink-0" />
            </div>

            {/* Description */}
            {strategy.description && (
              <p className="text-sm text-text-dark/60 line-clamp-2">
                {strategy.description}
              </p>
            )}

            {/* Multi-color progress bar */}
            {total > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full bg-border-dark/30 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${onTrackPct}%` }}
                  />
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${atRiskPct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-text-dark w-10 text-right">
                  {progressPct}%
                </span>
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-text-dark/50">
              {total > 0 && (
                <>
                  <span>{total} Objectives</span>
                  <span className="text-emerald-400">{onTrack} On Track</span>
                  {atRisk > 0 && (
                    <span className="text-amber-400">{atRisk} At Risk</span>
                  )}
                </>
              )}
              {period && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {period}
                </span>
              )}
            </div>

            {/* Focus areas */}
            {focusAreas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-text-dark/50">Key Focus Areas:</span>
                {focusAreas.slice(0, 4).map((area) => (
                  <Badge key={area} variant="default" size="sm">
                    {area}
                  </Badge>
                ))}
                {focusAreas.length > 4 && (
                  <Badge variant="default" size="sm">
                    +{focusAreas.length - 4} more
                  </Badge>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-text-dark/40">
              <span>Linked Campaigns: {(strategy as unknown as Record<string, unknown>).linkedCampaigns ? ((strategy as unknown as Record<string, unknown>).linkedCampaigns as unknown[]).length : 0}</span>
              <span>Last updated: {formatDistanceToNow(strategy.updatedAt)}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CreateStrategyModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [strategyType, setStrategyType] = useState("GROWTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vision, setVision] = useState("");
  const [focusAreasText, setFocusAreasText] = useState("");
  const [addObjectives, setAddObjectives] = useState(false);

  const createStrategy = useCreateStrategy();
  const toast = useToast();
  const router = useRouter();

  const TYPES = [
    { value: "GROWTH", icon: "📈", label: "Growth" },
    { value: "MARKET_ENTRY", icon: "🌍", label: "Market Entry" },
    { value: "PRODUCT_LAUNCH", icon: "🚀", label: "Product Launch" },
    { value: "BRAND_BUILDING", icon: "🎨", label: "Brand Building" },
    { value: "OPERATIONAL_EXCELLENCE", icon: "⚙️", label: "Operational Excellence" },
    { value: "CUSTOM", icon: "🔧", label: "Custom" },
  ];

  const reset = () => {
    setTitle("");
    setDescription("");
    setStrategyType("GROWTH");
    setStartDate("");
    setEndDate("");
    setVision("");
    setFocusAreasText("");
    setAddObjectives(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const focusAreas = focusAreasText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const selected = TYPES.find((t) => t.value === strategyType);

    createStrategy.mutate(
      {
        type: strategyType,
        title: title.trim(),
        description: description.trim() || undefined,
        status: "active",
        workspaceId: "",
        icon: selected?.icon,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        vision: vision.trim() || undefined,
        focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
      },
      {
        onSuccess: (data) => {
          toast.success("Strategy created", `${title} has been created.`);
          reset();
          onClose();
          if (addObjectives && data && typeof data === "object" && "id" in data) {
            router.push(
              `/knowledge/business-strategy/${(data as { id: string }).id}`
            );
          }
        },
        onError: () => {
          toast.error("Failed to create strategy", "Please try again.");
        },
      }
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create Business Strategy"
      description="Define a new strategic initiative for your business"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!title.trim() || createStrategy.isPending}
          >
            {createStrategy.isPending ? "Creating..." : "Create Strategy"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Strategy Name *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Growth Strategy 2026"
        />
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this strategic initiative..."
            rows={3}
            className="w-full rounded-lg border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Strategy Type */}
        <div>
          <p className="text-sm font-medium text-text-dark mb-2">
            Strategy Type
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setStrategyType(t.value)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  strategyType === t.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border-dark bg-surface-dark hover:border-text-dark/20"
                )}
              >
                <span className="text-xl">{t.icon}</span>
                <p className="text-xs font-medium text-text-dark mt-1">
                  {t.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Vision */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1">
            Strategic Vision
          </label>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="What does success look like for this strategy?"
            rows={2}
            className="w-full rounded-lg border border-border-dark bg-surface-dark px-3 py-2 text-sm text-text-dark placeholder:text-text-dark/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Focus Areas */}
        <Input
          label="Key Focus Areas"
          value={focusAreasText}
          onChange={(e) => setFocusAreasText(e.target.value)}
          placeholder="Market Share, Revenue Growth, Brand Awareness (comma-separated)"
        />

        {/* Add objectives checkbox */}
        <label className="flex items-center gap-2 text-sm text-text-dark/70 cursor-pointer">
          <input
            type="checkbox"
            checked={addObjectives}
            onChange={(e) => setAddObjectives(e.target.checked)}
            className="rounded border-border-dark"
          />
          Add initial objectives after creation
        </label>
      </div>
    </Modal>
  );
}
