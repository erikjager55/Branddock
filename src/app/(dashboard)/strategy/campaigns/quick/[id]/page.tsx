"use client";

import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Check,
  Sparkles,
  Pencil,
  FileText,
  ArrowRight,
  Info,
  ChevronDown,
  Users,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";

// ────────────────────────────── Placeholder Data ──────────────────────────────

const quickContentData: Record<
  string,
  {
    title: string;
    type: string;
    typeLabel: string;
    status: "active" | "completed";
    prompt: string;
    createdAt: string;
    qualityScore: number | null;
    progress: number;
    contentTitle: string;
  }
> = {
  "qc-1": {
    title: "Blog Post - Feb 9",
    type: "blog",
    typeLabel: "Blog Post",
    status: "completed",
    prompt: "Write about our latest product launch and how AI-powered brand management is transforming the industry.",
    createdAt: "Feb 9, 2026 at 10:32 AM",
    qualityScore: 8.5,
    progress: 100,
    contentTitle: '5 Ways to Improve Your Brand Strategy with AI',
  },
  "qc-2": {
    title: "LinkedIn Post - Feb 8",
    type: "social",
    typeLabel: "Social Media",
    status: "active",
    prompt: "Share industry insights for Q1 focusing on brand consistency trends.",
    createdAt: "Feb 8, 2026 at 3:15 PM",
    qualityScore: null,
    progress: 65,
    contentTitle: "LinkedIn Post: Q1 Brand Trends",
  },
};

const defaultContent = {
  title: "Quick Content",
  type: "blog",
  typeLabel: "Blog Post",
  status: "completed" as const,
  prompt: "Create content about brand strategy.",
  createdAt: "Feb 9, 2026",
  qualityScore: 7.8,
  progress: 100,
  contentTitle: "Untitled Content",
};

const RESEARCH_ASSETS = [
  { name: "Brand Positioning", validated: true },
  { name: "Professional Persona (Marketing Mary)", validated: true },
  { name: "Core Values", validated: true },
  { name: "Product: Branddock Platform", validated: true },
  { name: "Market Insight: AI Trend", validated: false },
];

// ────────────────────────────── Component ──────────────────────────────

export default function QuickContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const content = quickContentData[id] || defaultContent;
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertName, setConvertName] = useState(content.title);
  const [showSettings, setShowSettings] = useState(false);

  const validatedCount = RESEARCH_ASSETS.filter((a) => a.validated).length;
  const coveragePercent = Math.round((validatedCount / RESEARCH_ASSETS.length) * 100);

  const breadcrumbItems = [
    { label: "Strategy", href: "/strategy" },
    { label: "Campaigns", href: "/strategy/campaigns" },
    { label: content.title },
  ];

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-dark">{content.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="warning" size="sm">
              <Zap className="w-3 h-3" />
              Quick Content
            </Badge>
            <Badge
              variant={content.status === "completed" ? "success" : "info"}
              size="sm"
              dot
            >
              {content.status === "completed" ? "Completed" : "Active"}
            </Badge>
          </div>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Sparkles className="w-4 h-4" />}
          onClick={() => setShowConvertModal(true)}
        >
          Convert to Full Campaign
        </Button>
      </div>

      {/* Convert Banner */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-300">
            This is a Quick Campaign with auto-selected settings
          </p>
          <p className="text-xs text-blue-300/60 mt-0.5">
            Convert to full campaign for more control
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          onClick={() => setShowConvertModal(true)}
        >
          Convert Now
        </Button>
      </div>

      {/* Research Foundation */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-text-dark">Research Foundation</p>
          <Badge variant="info" size="sm">
            <Sparkles className="w-3 h-3" />
            {coveragePercent}% Coverage
          </Badge>
        </div>
        <p className="text-xs text-text-dark/40 mb-4">Auto-selected validated assets</p>
        <div className="space-y-2">
          {RESEARCH_ASSETS.map((asset) => (
            <div
              key={asset.name}
              className="flex items-center gap-2 text-sm"
            >
              <Check
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  asset.validated ? "text-emerald-400" : "text-text-dark/20"
                )}
              />
              <span
                className={cn(
                  asset.validated ? "text-text-dark" : "text-text-dark/40"
                )}
              >
                {asset.name}
              </span>
            </div>
          ))}
        </div>
        <button className="text-xs text-primary hover:text-primary/80 mt-3 transition-colors">
          Edit Assets
        </button>
      </Card>

      {/* Content Deliverable */}
      <Card padding="lg" className="mb-4">
        {content.status === "completed" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark">
                  {content.contentTitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="success" size="sm" dot>
                    Completed
                  </Badge>
                </div>
              </div>
              {content.qualityScore && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-text-dark/40">Quality Score</p>
                  <p className="text-lg font-bold text-primary flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {content.qualityScore}/10
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Pencil className="w-4 h-4" />}
              onClick={() =>
                router.push(
                  "/strategy/content-studio/cl-1"
                )
              }
            >
              Open in Studio
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark">
                  {content.contentTitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default" size="sm">
                    {content.typeLabel}
                  </Badge>
                  <Badge variant="info" size="sm" dot>
                    In Progress
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar
                value={content.progress}
                size="sm"
                className="flex-1"
              />
              <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                {content.progress}%
              </span>
            </div>
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Pencil className="w-4 h-4" />}
              onClick={() =>
                router.push(
                  "/strategy/content-studio/cl-1"
                )
              }
            >
              Open in Studio
            </Button>
          </div>
        )}
      </Card>

      {/* Quick Settings */}
      <div className="border border-border-dark rounded-lg overflow-hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-dark/50 transition-colors"
        >
          <p className="text-sm font-medium text-text-dark">Quick Settings</p>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-dark/40 transition-transform",
              showSettings && "rotate-180"
            )}
          />
        </button>
        {showSettings && (
          <div className="border-t border-border-dark px-4 py-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1">
                Original Prompt
              </p>
              <p className="text-sm text-text-dark/70">{content.prompt}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-dark/40 uppercase tracking-wide mb-1">
                Content Type
              </p>
              <p className="text-sm text-text-dark/70">{content.typeLabel}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-dark/40">
              <Clock className="w-3.5 h-3.5" />
              Created {content.createdAt}
            </div>
          </div>
        )}
      </div>

      {/* Convert Modal */}
      <Modal
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Upgrade to Strategic Campaign"
      >
        <div className="space-y-4">
          <div className="space-y-2.5">
            {[
              "Add more deliverables",
              "Generate full AI strategy",
              "Customize knowledge sources",
              "Add team members",
            ].map((benefit) => (
              <div
                key={benefit}
                className="flex items-center gap-2.5 text-sm text-text-dark"
              >
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {benefit}
              </div>
            ))}
          </div>
          <Input
            label="Campaign Name"
            value={convertName}
            onChange={(e) => setConvertName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowConvertModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowConvertModal(false);
                router.push("/strategy/campaigns/new");
              }}
            >
              Convert to Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
