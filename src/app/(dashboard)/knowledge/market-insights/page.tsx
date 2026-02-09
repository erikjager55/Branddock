"use client";

import { useState, useMemo } from "react";
import { Plus, TrendingUp, Calendar, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useMarketInsights, useCreateMarketInsight, MarketInsight } from "@/hooks/api/useMarketInsights";
import { useToast } from "@/hooks/useToast";

const tabs = [
  { label: "All", value: "all" },
  { label: "Trends", value: "TREND" },
  { label: "Competitor", value: "COMPETITOR" },
  { label: "Industry", value: "INDUSTRY" },
];

const typeConfig: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  TREND: { label: "Trend", variant: "info" },
  COMPETITOR: { label: "Competitor", variant: "warning" },
  INDUSTRY: { label: "Industry", variant: "success" },
};

const placeholderInsights: MarketInsight[] = [
  {
    id: "1", title: "Sustainability-First Branding Gaining Traction", source: "McKinsey Report 2025",
    type: "TREND", summary: "72% of consumers now consider sustainability claims when making purchase decisions, up from 58% in 2023. Brands with verified sustainability practices see 23% higher customer loyalty.",
    content: null, workspaceId: "mock", createdById: "mock",
    createdAt: "2025-02-03T00:00:00.000Z", updatedAt: "2025-02-03T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "2", title: "Competitor X Launches Premium Tier", source: "TechCrunch",
    type: "COMPETITOR", summary: "Direct competitor has introduced a premium tier at $99/month targeting enterprise customers, potentially shifting market positioning. Their messaging focuses on AI-powered analytics.",
    content: null, workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-28T00:00:00.000Z", updatedAt: "2025-01-28T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "3", title: "AI-Driven Personalization Becomes Table Stakes", source: "Gartner Research",
    type: "INDUSTRY", summary: "By 2026, 80% of B2B SaaS companies will offer AI-driven personalization. Companies without AI capabilities risk being perceived as outdated by their target audience.",
    content: null, workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-20T00:00:00.000Z", updatedAt: "2025-01-20T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
  {
    id: "4", title: "Gen Z Brand Loyalty Patterns Shifting", source: "Deloitte Consumer Survey",
    type: "TREND", summary: "Gen Z shows 40% lower brand loyalty than millennials but 3x higher engagement with brands that offer community-driven experiences and transparent communication.",
    content: null, workspaceId: "mock", createdById: "mock",
    createdAt: "2025-01-12T00:00:00.000Z", updatedAt: "2025-01-12T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MarketInsightsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formType, setFormType] = useState<"TREND" | "COMPETITOR" | "INDUSTRY">("TREND");
  const [formSummary, setFormSummary] = useState("");

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError, refetch } = useMarketInsights({
    workspaceId,
    type: activeTab !== "all" ? activeTab : undefined,
  });

  const createInsight = useCreateMarketInsight();
  const toast = useToast();

  const insights = useMemo(() => {
    if (apiData?.data && apiData.data.length > 0) return apiData.data;
    if (activeTab === "all") return placeholderInsights;
    return placeholderInsights.filter((i) => i.type === activeTab);
  }, [apiData, activeTab]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createInsight.mutate(
      { title: formTitle, source: formSource, type: formType, summary: formSummary, workspaceId },
      {
        onSuccess: () => {
          toast.success("Insight added", "Your market insight has been added.");
          setFormTitle("");
          setFormSource("");
          setFormType("TREND");
          setFormSummary("");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to add insight", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Market Insights</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Add Insight
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Track market trends, competitor moves, and industry developments
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" className="mb-6" />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={120} />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-dark mb-1">Failed to load insights</h3>
          <p className="text-sm text-text-dark/40 mb-4">Something went wrong.</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-8 h-8" />}
          title="No insights yet"
          description="Add insights to track market developments"
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Insight
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const type = typeConfig[insight.type] || typeConfig.TREND;
            return (
              <Card key={insight.id} hoverable padding="lg">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-dark">{insight.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={type.variant} size="sm">{type.label}</Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-text-dark/60 line-clamp-2">{insight.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-text-dark/40">
                      {insight.source && (
                        <span className="flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" />
                          {insight.source}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(insight.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Insight Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Market Insight">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Title *</label>
            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Enter insight title" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Source</label>
            <Input value={formSource} onChange={(e) => setFormSource(e.target.value)} placeholder="e.g. McKinsey Report 2025" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Type *</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as typeof formType)}
              className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="TREND">Trend</option>
              <option value="COMPETITOR">Competitor</option>
              <option value="INDUSTRY">Industry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">Summary</label>
            <Input value={formSummary} onChange={(e) => setFormSummary(e.target.value)} placeholder="Brief summary of the insight" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createInsight.isPending}>
              {createInsight.isPending ? "Adding..." : "Add Insight"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
