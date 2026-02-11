"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle,
  Download,
  Calendar,
  Users,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Image as ImageIcon,
  Bot,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  Edit2,
  Info,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { WorkshopHeader } from "@/features/knowledge/brand-foundation/WorkshopHeader";
import {
  useAssetWorkshops,
  useWorkshop,
} from "@/hooks/api/useWorkshops";
import {
  MOCK_KEY_FINDINGS,
  MOCK_RECOMMENDATIONS,
  MOCK_PARTICIPANTS,
  MOCK_OBJECTIVES,
  MOCK_AGENDA,
  MOCK_NOTES,
  MOCK_GALLERY,
} from "@/lib/constants/workshop";
import { cn } from "@/lib/utils";

const TAB_LIST = [
  { label: "Overview", value: "overview" },
  { label: "Canvas", value: "canvas" },
  { label: "Workshop", value: "workshop" },
  { label: "Notes", value: "notes" },
  { label: "Gallery", value: "gallery" },
];

export default function WorkshopCompletePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const [canvasExpanded, setCanvasExpanded] = useState<Record<string, boolean>>({
    why: true,
    how: true,
    what: true,
  });
  const [showExplanation, setShowExplanation] = useState(false);

  // ── API data ──
  const { data: workshops } = useAssetWorkshops(id);
  const workshopList = Array.isArray(workshops) ? workshops.filter((w) => w.status === "COMPLETED") : [];
  const [workshopIndex, setWorkshopIndex] = useState(0);
  const currentWorkshopId = workshopList[workshopIndex]?.id ?? "";
  const { data: workshop } = useWorkshop(currentWorkshopId);

  // Fallback data from API or mock constants
  const keyFindings =
    (workshop?.aiReport as Record<string, unknown>)?.keyFindings as typeof MOCK_KEY_FINDINGS | undefined
    ?? MOCK_KEY_FINDINGS;
  const recommendations =
    (workshop?.aiReport as Record<string, unknown>)?.recommendations as string[] | undefined
    ?? [...MOCK_RECOMMENDATIONS];
  const executiveSummary =
    ((workshop?.aiReport as Record<string, unknown>)?.executiveSummary as string) ??
    "The Canvas Workshop successfully aligned 8 team members on Branddock\u2019s core brand elements. Through structured exercises, the team identified the brand\u2019s fundamental purpose, unique value proposition, and strategic positioning. Key themes of AI democratization and brand consistency emerged as central pillars. The workshop produced actionable guidelines for maintaining brand integrity across all channels.";
  const participants =
    (workshop?.participants as Array<{ name: string; role: string }>) ?? [...MOCK_PARTICIPANTS];
  const objectives =
    (workshop?.objectives as string[]) ?? [...MOCK_OBJECTIVES];
  const agenda =
    (workshop?.agenda as Array<{ time: string; item: string }>) ?? [...MOCK_AGENDA];
  const notes =
    (workshop?.notes as Array<{ name: string; time: string; text: string }>) ?? [...MOCK_NOTES];
  const gallery =
    (workshop?.gallery as Array<{ caption: string; url?: string }>) ?? [...MOCK_GALLERY];

  const canvas = (workshop?.canvas ?? {}) as Record<string, { title?: string; subtitle?: string; content?: string; tip?: string }>;
  const whyData = canvas.why ?? {
    title: "WHY — Purpose",
    subtitle: "Your brand\u2019s reason for existence",
    content: "To democratize brand management so every company can build a brand that truly resonates.",
    tip: "Purpose should answer: Why does your brand exist beyond making money?",
  };
  const howData = canvas.how ?? {
    title: "HOW — Process",
    subtitle: "Your unique approach",
    content: "Through an AI-powered platform that integrates knowledge, strategy, and content creation in one seamless workflow.",
    tip: "Process describes your unique approach to fulfilling your purpose.",
  };
  const whatData = canvas.what ?? {
    title: "WHAT — Product",
    subtitle: "The tangible output",
    content: "An intelligent brand management platform with AI-driven analysis, campaign creation, and content generation.",
    tip: "Product is the tangible output \u2014 what customers actually buy.",
  };

  const completedDate = workshop?.completedAt
    ? new Date(workshop.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Feb 5, 2026";
  const startedDate = workshop?.startedAt
    ? new Date(workshop.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Feb 5, 2026";
  const participantCount = workshop?.participantCount ?? participants.length;
  const duration = workshop?.duration ? `${(workshop.duration / 60).toFixed(1)} hours` : "1.5 hours";
  const hasFacilitator = workshop?.facilitator ?? workshop?.hasFacilitator;

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Brand Assets", href: "/knowledge/brand-foundation" },
    { label: "Canvas Workshop" },
  ];

  const toggleSection = (key: string) => {
    setCanvasExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Workshop Header */}
      <WorkshopHeader
        status="COMPLETED"
        subtitle="Review workshop results and insights"
        className="mb-6"
      />

      {/* Workshop Navigation */}
      {workshopList.length > 0 && (
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setWorkshopIndex(Math.max(0, workshopIndex - 1))}
            disabled={workshopIndex === 0}
            className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-text-dark/50">
            Workshop {workshopIndex + 1} of {workshopList.length || 1}
          </span>
          <button
            onClick={() => setWorkshopIndex(Math.min(workshopList.length - 1, workshopIndex + 1))}
            disabled={workshopIndex >= workshopList.length - 1}
            className="p-2 rounded-md text-text-dark/40 hover:text-text-dark hover:bg-surface-dark transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Completion Banner */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-text-dark mb-1">
              Workshop Complete
            </h2>
            <p className="text-sm text-text-dark/50 mb-3">
              {participantCount} participants completed all 6 steps in {duration}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-dark/50 mb-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Started {startedDate}
              </span>
              <span className="text-text-dark/20">&bull;</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Completed {completedDate}
              </span>
              <span className="text-text-dark/20">&bull;</span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> {participantCount} participants
              </span>
              {hasFacilitator && (
                <>
                  <span className="text-text-dark/20">&bull;</span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> External facilitator
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" size="sm">
                <CheckCircle className="w-3 h-3" /> Completed
              </Badge>
              <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                PDF
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                Raw data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={TAB_LIST} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="mb-6" />

      {/* ══ Overview Tab ══ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* AI Generated Report Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-dark">AI Generated Report</h3>
              <p className="text-xs text-text-dark/40">Analysis based on workshop responses</p>
            </div>
          </div>

          {/* Executive Summary */}
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-text-dark">Executive Summary</h3>
            </div>
            <p className="text-sm text-text-dark/70 leading-relaxed">
              {executiveSummary}
            </p>
          </Card>

          {/* Key Findings */}
          <Card padding="none">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-text-dark">Key Findings</h3>
              </div>
            </div>
            <div className="divide-y divide-border-dark">
              {keyFindings.map((f, i) => (
                <div
                  key={f.num ?? i}
                  className={cn("flex gap-3 px-6 py-4", i % 2 === 0 && "bg-emerald-500/[0.02]")}
                >
                  <span className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {f.num ?? i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-dark">{f.title}</p>
                    <p className="text-sm text-text-dark/60">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommendations */}
          <Card padding="none">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-text-dark">Strategic Recommendations</h3>
              </div>
            </div>
            <div className="divide-y divide-border-dark">
              {recommendations.map((r, i) => (
                <div
                  key={i}
                  className={cn("flex items-start gap-3 px-6 py-4", i % 2 === 0 && "bg-emerald-500/[0.02]")}
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-sm text-text-dark/70">{r}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ══ Canvas Tab ══ */}
      {activeTab === "canvas" && (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-dark">
                Workshop-Generated Golden Circle
              </h3>
              <p className="text-xs text-text-dark/40 mt-0.5">
                Framework generated from your AI workshop session
              </p>
            </div>
            <Badge variant="info" size="sm">
              <Bot className="w-3 h-3" />
              Generated from AI session
            </Badge>
          </div>

          {/* Collapsible Example */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                <Info className="w-4 h-4" />
                Canvas Example & Explanation
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-amber-300/50 transition-transform",
                  showExplanation && "rotate-180"
                )}
              />
            </button>
            {showExplanation && (
              <div className="px-4 pb-4">
                <p className="text-sm text-amber-200/60">
                  The Golden Circle framework (by Simon Sinek) defines your brand from the inside out:
                  WHY you exist, HOW you deliver, and WHAT you offer. The responses below were
                  synthesized from your workshop exercises.
                </p>
              </div>
            )}
          </div>

          {/* WHY Section */}
          <CanvasSection
            borderColor="border-l-emerald-500"
            bgColor="bg-emerald-500/[0.03]"
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            title={whyData.title ?? "WHY — Purpose"}
            subtitle={whyData.subtitle ?? "Your brand\u2019s reason for existence"}
            content={whyData.content ?? ""}
            tip={whyData.tip ?? ""}
            expanded={canvasExpanded.why}
            onToggle={() => toggleSection("why")}
          />

          {/* HOW Section */}
          <CanvasSection
            borderColor="border-l-emerald-500"
            bgColor="bg-emerald-500/[0.03]"
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            title={howData.title ?? "HOW — Process"}
            subtitle={howData.subtitle ?? "Your unique approach"}
            content={howData.content ?? ""}
            tip={howData.tip ?? ""}
            expanded={canvasExpanded.how}
            onToggle={() => toggleSection("how")}
          />

          {/* WHAT Section */}
          <CanvasSection
            borderColor="border-l-orange-500"
            bgColor="bg-orange-500/[0.03]"
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
            title={whatData.title ?? "WHAT — Product"}
            subtitle={whatData.subtitle ?? "The tangible output"}
            content={whatData.content ?? ""}
            tip={whatData.tip ?? ""}
            expanded={canvasExpanded.what}
            onToggle={() => toggleSection("what")}
          />

          {/* Flow Indicator */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-xs text-text-dark/40">WHY</span>
            </div>
            <div className="w-8 h-px bg-border-dark" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs text-text-dark/40">HOW</span>
            </div>
            <div className="w-8 h-px bg-border-dark" />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="text-xs text-text-dark/40">WHAT</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ Workshop Tab ══ */}
      {activeTab === "workshop" && (
        <div className="space-y-6">
          {/* Objectives */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Objectives</h3>
            <div className="space-y-2">
              {objectives.map((o, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-sm text-text-dark/70">{typeof o === "string" ? o : ""}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Participants */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">
              Participants ({participants.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {p.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-dark">{p.name}</p>
                    <p className="text-[10px] text-text-dark/40">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Agenda */}
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-text-dark mb-3">Agenda</h3>
            <div className="space-y-0">
              {agenda.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-border-dark last:border-0"
                >
                  <Clock className="w-3.5 h-3.5 text-text-dark/30 flex-shrink-0" />
                  <span className="text-xs font-mono text-text-dark/40 w-12">{a.time}</span>
                  <span className="text-sm text-text-dark/70">{a.item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ══ Notes Tab ══ */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-text-dark">
              Participant Notes & Insights
            </h3>
            <Badge variant="default" size="sm">{notes.length} notes</Badge>
          </div>
          {notes.map((n, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-semibold text-amber-400">
                  {n.name
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")}
                </div>
                <span className="text-sm font-medium text-text-dark">{n.name}</span>
                <span className="text-xs text-text-dark/30">{n.time}</span>
              </div>
              <p className="text-sm text-text-dark/70 ml-9">{n.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══ Gallery Tab ══ */}
      {activeTab === "gallery" && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-text-dark mb-2">
            Workshop Gallery
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {gallery.map((g, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video rounded-xl bg-surface-dark border border-border-dark flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-text-dark/20" />
                </div>
                <p className="text-xs text-text-dark/40 text-center">{g.caption}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border-dark">
        <Link
          href={`/knowledge/brand-foundation/${id}`}
          className="text-sm text-text-dark/50 hover:text-text-dark flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Asset
        </Link>
        <Button variant="primary" leftIcon={<Check className="w-4 h-4" />}>
          Done
        </Button>
      </div>
    </div>
  );
}

// ── Canvas Section sub-component ──

function CanvasSection({
  borderColor,
  bgColor,
  iconColor,
  iconBg,
  title,
  subtitle,
  content,
  tip,
  expanded,
  onToggle,
}: {
  borderColor: string;
  bgColor: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  content: string;
  tip: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-dark overflow-hidden border-l-4",
        borderColor,
        bgColor
      )}
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", iconBg)}>
              <Sparkles className={cn("w-4 h-4", iconColor)} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-dark">{title}</h4>
              <p className="text-xs text-text-dark/40">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md text-text-dark/30 hover:text-text-dark transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md text-text-dark/30 hover:text-text-dark transition-colors"
            >
              <ChevronDown
                className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")}
              />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 ml-11">
            <p className="text-sm text-text-dark/70 leading-relaxed mb-3">
              &ldquo;{content}&rdquo;
            </p>
            <div className="flex items-start gap-2 text-xs text-text-dark/40">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {tip}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
