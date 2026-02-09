"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  Plus,
  Megaphone,
  Calendar,
  FileText,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: "planning" | "active" | "completed";
  startDate: string;
  endDate: string;
  progress: number;
  contentCount: number;
  description: string;
}

const campaigns: Campaign[] = [
  {
    id: "campaign-launch-2025",
    name: "Q1 Product Launch",
    status: "active",
    startDate: "Jan 15, 2025",
    endDate: "Mar 31, 2025",
    progress: 65,
    contentCount: 12,
    description:
      "Major product launch campaign targeting enterprise marketing teams with new AI-powered features.",
  },
  {
    id: "campaign-brand-awareness",
    name: "Brand Awareness Drive",
    status: "active",
    startDate: "Feb 1, 2025",
    endDate: "Apr 30, 2025",
    progress: 35,
    contentCount: 8,
    description:
      "Multi-channel awareness campaign to establish Branddock as a thought leader in brand management.",
  },
  {
    id: "campaign-partner",
    name: "Partner Co-Marketing",
    status: "planning",
    startDate: "Mar 1, 2025",
    endDate: "May 31, 2025",
    progress: 10,
    contentCount: 3,
    description:
      "Collaborative campaign with integration partners to reach new audiences and drive sign-ups.",
  },
  {
    id: "campaign-holiday",
    name: "Holiday Rebranding Guide",
    status: "completed",
    startDate: "Nov 1, 2024",
    endDate: "Dec 31, 2024",
    progress: 100,
    contentCount: 18,
    description:
      "Seasonal campaign helping brands maintain consistency during holiday marketing pushes.",
  },
];

const statusConfig: Record<
  Campaign["status"],
  { variant: "info" | "success" | "default"; label: string }
> = {
  planning: { variant: "default", label: "Planning" },
  active: { variant: "info", label: "Active" },
  completed: { variant: "success", label: "Completed" },
};

const tabs = [
  { label: "All", value: "all" },
  { label: "Planning", value: "planning" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    if (activeTab === "all") return campaigns;
    return campaigns.filter((c) => c.status === activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Campaigns</h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Campaign
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Plan, execute, and track your brand campaigns
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-12 h-12 text-text-dark/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-dark mb-1">
              No {activeTab} campaigns
            </h3>
            <p className="text-sm text-text-dark/40">
              Create a campaign to get started
            </p>
          </div>
        ) : (
          filtered.map((campaign) => {
            const config = statusConfig[campaign.status];
            return (
              <Link
                key={campaign.id}
                href={`/strategy/campaigns/${campaign.id}`}
              >
                <Card hoverable padding="lg">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-text-dark">
                            {campaign.name}
                          </h3>
                          <p className="text-xs text-text-dark/40 line-clamp-1 mt-0.5">
                            {campaign.description}
                          </p>
                        </div>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-text-dark/40">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {campaign.startDate} — {campaign.endDate}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {campaign.contentCount} content pieces
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={campaign.progress}
                          size="sm"
                          variant={
                            campaign.progress === 100 ? "success" : "default"
                          }
                          className="flex-1"
                        />
                        <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                          {campaign.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
