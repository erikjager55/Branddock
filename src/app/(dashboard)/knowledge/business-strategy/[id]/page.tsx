"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { useStrategy } from "@/hooks/api/useStrategies";
import { toStringArray } from "@/lib/json-render";

// ────────────────────────────── Types ──────────────────────────────

interface KeyResult {
  id: string;
  text: string;
  progress: string;
  status: "complete" | "on-track" | "behind";
}

interface Objective {
  id: string;
  number: number;
  title: string;
  description: string;
  status: "on-track" | "at-risk";
  target: string;
  current: string;
  start: string;
  progressPercent: number;
  keyResults: KeyResult[];
  linkedCampaigns: string[];
}

interface FocusArea {
  id: string;
  label: string;
  icon: React.ReactNode;
  objectiveCount: number;
}

interface LinkedCampaign {
  id: string;
  name: string;
  status: "Active" | "Completed";
  deliverables: number;
  completion: number;
  targets: string[];
}

interface Milestone {
  id: string;
  label: string;
  date: string;
  quarter: string;
  done: boolean;
}

// ────────────────────────────── Icon mapping ──────────────────────────────

const strategyIcons: Record<string, React.ReactNode> = {
  "growth-strategy": <TrendingUp className="w-6 h-6 text-primary" />,
  growth: <TrendingUp className="w-6 h-6 text-primary" />,
  "target-audience": <Users className="w-6 h-6 text-primary" />,
  "competitive-landscape": <BarChart3 className="w-6 h-6 text-primary" />,
  "market-position": <Target className="w-6 h-6 text-primary" />,
};

// ────────────────────────────── Placeholder Detail Data ──────────────────────────────
// These represent objectives, focus areas, campaigns, and milestones
// that aren't yet stored in the database. They provide rich UI while
// the API handles the strategy header/context data.

const OBJECTIVES: Objective[] = [
  {
    id: "obj-1",
    number: 1,
    title: "Increase Market Share",
    description: "Expand our presence in key markets and capture a larger share of the AI-powered brand management space.",
    status: "on-track",
    target: "15%",
    current: "12%",
    start: "8%",
    progressPercent: 57,
    keyResults: [
      { id: "kr-1a", text: "Launch in 3 new regions", progress: "2/3", status: "complete" },
      { id: "kr-1b", text: "Acquire 500 new enterprise customers", progress: "380/500", status: "on-track" },
      { id: "kr-1c", text: "Establish 10 strategic partnerships", progress: "7/10", status: "on-track" },
    ],
    linkedCampaigns: ["Brand Awareness Q1", "Enterprise Customer Push"],
  },
  {
    id: "obj-2",
    number: 2,
    title: "Revenue Growth",
    description: "Drive significant revenue growth through premium offerings and reduced churn.",
    status: "on-track",
    target: "$5M",
    current: "$3.2M",
    start: "$1.8M",
    progressPercent: 44,
    keyResults: [
      { id: "kr-2a", text: "Launch premium tier", progress: "Complete", status: "complete" },
      { id: "kr-2b", text: "Increase ARPU by 30%", progress: "+22%", status: "on-track" },
      { id: "kr-2c", text: "Reduce churn below 5%", progress: "6.1%", status: "behind" },
    ],
    linkedCampaigns: ["Premium Tier Launch", "Content Marketing Program"],
  },
  {
    id: "obj-3",
    number: 3,
    title: "Brand Awareness",
    description: "Establish Branddock as a recognized thought leader in the brand management space.",
    status: "at-risk",
    target: "35%",
    current: "21%",
    start: "12%",
    progressPercent: 39,
    keyResults: [
      { id: "kr-3a", text: "Publish 50 thought leadership pieces", progress: "Complete", status: "complete" },
      { id: "kr-3b", text: "Reach 100K social followers", progress: "45K/100K", status: "behind" },
      { id: "kr-3c", text: "Secure 25 media mentions", progress: "8/25", status: "behind" },
    ],
    linkedCampaigns: [],
  },
  {
    id: "obj-4",
    number: 4,
    title: "Customer Acquisition",
    description: "Efficiently acquire new customers through targeted marketing campaigns and reduced CAC.",
    status: "on-track",
    target: "500",
    current: "340",
    start: "150",
    progressPercent: 54,
    keyResults: [
      { id: "kr-4a", text: "Launch 5 marketing campaigns", progress: "Complete", status: "complete" },
      { id: "kr-4b", text: "Reduce CAC by 25%", progress: "-18%", status: "on-track" },
    ],
    linkedCampaigns: [],
  },
  {
    id: "obj-5",
    number: 5,
    title: "Strategic Partnerships",
    description: "Build a strong partner ecosystem to extend reach and add value to our platform.",
    status: "on-track",
    target: "10",
    current: "26",
    start: "5",
    progressPercent: 100,
    keyResults: [
      { id: "kr-5a", text: "Sign 12 channel partners", progress: "7/12", status: "on-track" },
      { id: "kr-5b", text: "Co-marketing with 5 partners", progress: "3/5", status: "on-track" },
    ],
    linkedCampaigns: [],
  },
];

const FOCUS_AREAS: FocusArea[] = [
  { id: "fa-1", label: "Market Share", icon: <BarChart3 className="w-5 h-5" />, objectiveCount: 2 },
  { id: "fa-2", label: "Revenue Growth", icon: <DollarSign className="w-5 h-5" />, objectiveCount: 1 },
  { id: "fa-3", label: "Customer Acquisition", icon: <Users className="w-5 h-5" />, objectiveCount: 2 },
  { id: "fa-4", label: "Brand Awareness", icon: <Star className="w-5 h-5" />, objectiveCount: 1 },
  { id: "fa-5", label: "Partnerships", icon: <Handshake className="w-5 h-5" />, objectiveCount: 1 },
];

const LINKED_CAMPAIGNS: LinkedCampaign[] = [
  { id: "lc-1", name: "Brand Awareness Q1", status: "Active", deliverables: 8, completion: 85, targets: ["Brand Awareness"] },
  { id: "lc-2", name: "Enterprise Customer Push", status: "Active", deliverables: 12, completion: 45, targets: ["Market Share", "Revenue"] },
  { id: "lc-3", name: "Premium Tier Launch", status: "Completed", deliverables: 6, completion: 100, targets: ["Revenue Growth"] },
  { id: "lc-4", name: "Content Marketing Program", status: "Active", deliverables: 24, completion: 38, targets: ["Brand Awareness"] },
];

const MILESTONES: Milestone[] = [
  { id: "ms-1", label: "Strategy Launch", date: "Jan 15", quarter: "Q1", done: true },
  { id: "ms-2", label: "Mid-Year Review", date: "Jul 1", quarter: "Q2", done: false },
  { id: "ms-3", label: "Product Launch", date: "Sep 15", quarter: "Q3", done: false },
  { id: "ms-4", label: "Annual Review", date: "Dec 31", quarter: "Q4", done: false },
];

const FOCUS_AREA_OPTIONS = [
  { value: "market-share", label: "Market Share" },
  { value: "revenue", label: "Revenue Growth" },
  { value: "acquisition", label: "Customer Acquisition" },
  { value: "awareness", label: "Brand Awareness" },
  { value: "partnerships", label: "Partnerships" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ────────────────────────────── Helper ──────────────────────────────

function krStatusIcon(status: KeyResult["status"]) {
  switch (status) {
    case "complete":
      return <Check className="w-4 h-4 text-emerald-400" />;
    case "on-track":
      return <div className="w-4 h-4 rounded-full border-2 border-text-dark/30" />;
    case "behind":
      return <div className="w-4 h-4 rounded-full bg-red-500" />;
  }
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ────────────────────────────── Component ──────────────────────────────

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: strategy, isLoading, isError } = useStrategy(id);

  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(
    new Set(OBJECTIVES.map((o) => o.id))
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState("");
  const [newObjDesc, setNewObjDesc] = useState("");
  const [newObjFocus, setNewObjFocus] = useState("");
  const [newObjPriority, setNewObjPriority] = useState("medium");
  const [newObjMetricType, setNewObjMetricType] = useState("percentage");
  const [newObjStart, setNewObjStart] = useState("");
  const [newObjTarget, setNewObjTarget] = useState("");
  const [newObjCurrent, setNewObjCurrent] = useState("");
  const [newKRs, setNewKRs] = useState<string[]>([""]);

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

  const toggleObjective = (objId: string) => {
    setExpandedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objId)) next.delete(objId);
      else next.add(objId);
      return next;
    });
  };

  const onTrackCount = OBJECTIVES.filter((o) => o.status === "on-track").length;
  const atRiskCount = OBJECTIVES.filter((o) => o.status === "at-risk").length;
  const overallProgress = Math.round(OBJECTIVES.reduce((s, o) => s + o.progressPercent, 0) / OBJECTIVES.length);

  // Extract content from strategy JSON if available
  const strategyContent = (strategy.content || {}) as Record<string, unknown>;
  const vision = (strategyContent.vision as string) || strategy.description || "Strategy vision will appear here.";
  const rationale = (strategyContent.rationale as string) || "Strategy rationale will appear here.";
  const assumptions = toStringArray(strategyContent.assumptions).length > 0
    ? toStringArray(strategyContent.assumptions)
    : ["Assumption 1", "Assumption 2"];
  const icon = strategyIcons[strategy.type] || <TrendingUp className="w-6 h-6 text-primary" />;
  const isActive = strategy.status.toLowerCase() === "active";

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
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-dark">{strategy.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant={isActive ? "success" : "default"} size="sm" dot>
                {isActive ? "Active" : "Draft"}
              </Badge>
              <span className="text-xs text-text-dark/40 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                2026
              </span>
              <span className="text-xs text-text-dark/40 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last updated: {formatRelativeDate(strategy.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Archive className="w-3.5 h-3.5" />}>
            Archive
          </Button>
        </div>
      </div>

      {/* Strategy Progress */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-text-dark">Strategy Progress</h2>
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-3 rounded-full bg-border-dark/30 overflow-hidden flex">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${(onTrackCount / OBJECTIVES.length) * overallProgress}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(atRiskCount / OBJECTIVES.length) * overallProgress}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-text-dark w-10 text-right">{overallProgress}%</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-dark/50">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />On Track</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />At Risk</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-border-dark/50" />Remaining</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border-dark">
          <div className="text-center">
            <p className="text-2xl font-bold text-text-dark">{OBJECTIVES.length}</p>
            <p className="text-xs text-text-dark/40">Total Objectives</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{onTrackCount}</p>
            <p className="text-xs text-text-dark/40">On Track</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{atRiskCount}</p>
            <p className="text-xs text-text-dark/40">At Risk</p>
          </div>
        </div>
      </Card>

      {/* Strategic Context */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">Strategic Context</h2>
          </div>
          <button className="text-text-dark/40 hover:text-text-dark transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1.5">Vision for this Strategy</p>
            <p className="text-sm text-text-dark/70 leading-relaxed">{vision}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1.5">Strategic Rationale</p>
            <p className="text-sm text-text-dark/70 leading-relaxed">{rationale}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1.5">Key Assumptions</p>
            <ul className="space-y-1.5">
              {assumptions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-dark/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Strategic Objectives */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">Strategic Objectives</h2>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Objective
          </Button>
        </div>

        <div className="space-y-3">
          {OBJECTIVES.map((obj) => {
            const isExpanded = expandedObjectives.has(obj.id);
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
                      <span className="text-xs font-medium text-text-dark/40">#{obj.number}</span>
                      <h3 className="text-sm font-semibold text-text-dark">{obj.title}</h3>
                      <Badge
                        variant={obj.status === "on-track" ? "success" : "warning"}
                        size="sm"
                        dot
                      >
                        {obj.status === "on-track" ? "On Track" : "At Risk"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-dark/40 mt-1 line-clamp-1">{obj.description}</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 space-y-4 border-t border-border-dark pt-4 ml-7">
                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <ProgressBar
                        value={obj.progressPercent}
                        size="sm"
                        variant={obj.status === "on-track" ? "default" : "warning"}
                        className="flex-1"
                      />
                      <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                        {obj.progressPercent}%
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">Target</p>
                        <p className="text-sm font-semibold text-text-dark">{obj.target}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">Current</p>
                        <p className="text-sm font-semibold text-primary">{obj.current}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-dark/40 uppercase tracking-wide">Start</p>
                        <p className="text-sm font-semibold text-text-dark/50">{obj.start}</p>
                      </div>
                    </div>

                    {/* Key Results */}
                    <div>
                      <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-2">Key Results</p>
                      <div className="space-y-1.5">
                        {obj.keyResults.map((kr) => (
                          <div key={kr.id} className="flex items-center gap-2.5">
                            {krStatusIcon(kr.status)}
                            <span className={cn(
                              "text-sm flex-1",
                              kr.status === "complete" ? "text-text-dark/50" : "text-text-dark"
                            )}>
                              {kr.text}
                            </span>
                            <span className={cn(
                              "text-xs font-medium",
                              kr.status === "complete"
                                ? "text-emerald-400"
                                : kr.status === "behind"
                                  ? "text-red-400"
                                  : "text-text-dark/60"
                            )}>
                              {kr.progress}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Linked Campaigns */}
                    {obj.linkedCampaigns.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-text-dark/40">
                        <LinkIcon className="w-3.5 h-3.5" />
                        Linked Campaigns:
                        {obj.linkedCampaigns.map((c, i) => (
                          <span key={c}>
                            <button className="text-primary hover:text-primary/80 transition-colors">{c}</button>
                            {i < obj.linkedCampaigns.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Key Focus Areas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">Key Focus Areas</h2>
          </div>
          <button className="p-1.5 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {FOCUS_AREAS.map((area) => (
            <Card key={area.id} hoverable padding="md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {area.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-dark">{area.label}</p>
                  <p className="text-xs text-text-dark/40">{area.objectiveCount} Objectives</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Linked Campaigns */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-text-dark">Linked Campaigns</h2>
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Link Campaign
          </Button>
        </div>
        <p className="text-xs text-text-dark/40 mb-4">Campaigns executing this strategy</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LINKED_CAMPAIGNS.map((campaign) => (
            <Card key={campaign.id} hoverable padding="md">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-dark">{campaign.name}</h3>
                  <Badge
                    variant={campaign.status === "Completed" ? "success" : "info"}
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
                      <Badge key={t} variant="default" size="sm">{t}</Badge>
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
            <h2 className="text-base font-semibold text-text-dark">Key Milestones</h2>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Milestone
          </Button>
        </div>

        {/* Timeline */}
        <Card padding="lg">
          {/* Quarter labels */}
          <div className="flex items-center mb-6">
            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
              <div key={q} className="flex-1 text-center">
                <span className="text-xs font-medium text-text-dark/40">{q} 2026</span>
              </div>
            ))}
          </div>

          {/* Timeline line with dots */}
          <div className="relative h-8 mb-4">
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border-dark -translate-y-1/2" />
            {MILESTONES.map((ms, i) => (
              <div
                key={ms.id}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${((i + 0.5) / 4) * 100}%` }}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 -translate-x-1/2",
                  ms.done
                    ? "bg-primary border-primary"
                    : "bg-surface-dark border-amber-400"
                )}>
                  {ms.done && <Check className="w-2.5 h-2.5 text-white m-auto mt-[1px]" />}
                </div>
              </div>
            ))}
          </div>

          {/* Milestone cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MILESTONES.map((ms) => (
              <div
                key={ms.id}
                className={cn(
                  "p-3 rounded-lg border text-center",
                  ms.done
                    ? "border-primary/20 bg-primary/5"
                    : "border-border-dark"
                )}
              >
                <p className="text-xs font-semibold text-text-dark">{ms.label}</p>
                <p className="text-[10px] text-text-dark/40 mt-0.5">{ms.date}</p>
                <Badge
                  variant={ms.done ? "success" : "default"}
                  size="sm"
                  className="mt-1.5"
                >
                  {ms.done ? "Done" : "Upcoming"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add Objective Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
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
            <label className="block text-sm font-medium text-text-dark mb-1">Description</label>
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
            <p className="text-sm font-medium text-text-dark mb-2">Metric Type</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "percentage", label: "Percentage" },
                { value: "number", label: "Number" },
                { value: "currency", label: "Currency" },
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
            <p className="text-sm font-medium text-text-dark mb-2">Key Results</p>
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
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!newObjTitle.trim()}
              onClick={() => setShowAddModal(false)}
            >
              Add Objective
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
