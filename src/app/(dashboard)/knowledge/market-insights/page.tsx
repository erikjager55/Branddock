"use client";

import { useState, useMemo } from "react";
import { Plus, TrendingUp, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";

const tabs = [
  { label: "All", value: "all" },
  { label: "Trends", value: "trend" },
  { label: "Competitor", value: "competitor" },
  { label: "Industry", value: "industry" },
];

const typeConfig: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  trend: { label: "Trend", variant: "info" },
  competitor: { label: "Competitor", variant: "warning" },
  industry: { label: "Industry", variant: "success" },
};

const insights = [
  {
    id: "1",
    title: "Sustainability-First Branding Gaining Traction",
    source: "McKinsey Report 2025",
    type: "trend",
    date: "Feb 3, 2025",
    summary:
      "72% of consumers now consider sustainability claims when making purchase decisions, up from 58% in 2023. Brands with verified sustainability practices see 23% higher customer loyalty.",
  },
  {
    id: "2",
    title: "Competitor X Launches Premium Tier",
    source: "TechCrunch",
    type: "competitor",
    date: "Jan 28, 2025",
    summary:
      "Direct competitor has introduced a premium tier at $99/month targeting enterprise customers, potentially shifting market positioning. Their messaging focuses on AI-powered analytics.",
  },
  {
    id: "3",
    title: "AI-Driven Personalization Becomes Table Stakes",
    source: "Gartner Research",
    type: "industry",
    date: "Jan 20, 2025",
    summary:
      "By 2026, 80% of B2B SaaS companies will offer AI-driven personalization. Companies without AI capabilities risk being perceived as outdated by their target audience.",
  },
  {
    id: "4",
    title: "Gen Z Brand Loyalty Patterns Shifting",
    source: "Deloitte Consumer Survey",
    type: "trend",
    date: "Jan 12, 2025",
    summary:
      "Gen Z shows 40% lower brand loyalty than millennials but 3x higher engagement with brands that offer community-driven experiences and transparent communication.",
  },
];

export default function MarketInsightsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    if (activeTab === "all") return insights;
    return insights.filter((i) => i.type === activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">
            Market Insights
          </h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Insight
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Track market trends, competitor moves, and industry developments
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
        className="mb-6"
      />

      {/* Insight Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-dark mb-1">
              No {activeTab} insights
            </h3>
            <p className="text-sm text-text-dark/40">
              Add insights to track market developments
            </p>
          </div>
        ) : (
          filtered.map((insight) => {
            const type = typeConfig[insight.type];
            return (
              <Card key={insight.id} hoverable padding="lg">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-dark">
                          {insight.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={type.variant} size="sm">
                            {type.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-text-dark/60 line-clamp-2">
                      {insight.summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-dark/40">
                      <span className="flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {insight.source}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {insight.date}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
