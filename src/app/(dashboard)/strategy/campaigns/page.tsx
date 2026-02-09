"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import {
  Plus,
  Megaphone,
  Calendar,
  FileText,
} from "lucide-react";
import { useCampaigns, useCreateCampaign, Campaign } from "@/hooks/api/useCampaigns";
import { useToast } from "@/hooks/useToast";
import { DemoBanner } from "@/components/ui/DemoBanner";

// Placeholder data
const placeholderCampaigns: Campaign[] = [
  {
    id: "campaign-launch-2025",
    name: "Q1 Product Launch",
    status: "ACTIVE",
    startDate: "2025-01-15T00:00:00.000Z",
    endDate: "2025-03-31T00:00:00.000Z",
    description: "Major product launch campaign targeting enterprise marketing teams with new AI-powered features.",
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
    _count: { contents: 12 },
  },
  {
    id: "campaign-brand-awareness",
    name: "Brand Awareness Drive",
    status: "ACTIVE",
    startDate: "2025-02-01T00:00:00.000Z",
    endDate: "2025-04-30T00:00:00.000Z",
    description: "Multi-channel awareness campaign to establish Branddock as a thought leader in brand management.",
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2025-02-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
    _count: { contents: 8 },
  },
  {
    id: "campaign-partner",
    name: "Partner Co-Marketing",
    status: "PLANNING",
    startDate: "2025-03-01T00:00:00.000Z",
    endDate: "2025-05-31T00:00:00.000Z",
    description: "Collaborative campaign with integration partners to reach new audiences and drive sign-ups.",
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2025-03-01T00:00:00.000Z",
    updatedAt: "2025-03-01T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
    _count: { contents: 3 },
  },
  {
    id: "campaign-holiday",
    name: "Holiday Rebranding Guide",
    status: "COMPLETED",
    startDate: "2024-11-01T00:00:00.000Z",
    endDate: "2024-12-31T00:00:00.000Z",
    description: "Seasonal campaign helping brands maintain consistency during holiday marketing pushes.",
    workspaceId: "mock",
    createdById: "mock",
    createdAt: "2024-11-01T00:00:00.000Z",
    updatedAt: "2024-12-31T00:00:00.000Z",
    createdBy: { id: "mock", name: "Brand Manager", email: "manager@example.com" },
    _count: { contents: 18 },
  },
];

const statusConfig: Record<
  string,
  { variant: "info" | "success" | "default" | "warning"; label: string }
> = {
  PLANNING: { variant: "default", label: "Planning" },
  ACTIVE: { variant: "info", label: "Active" },
  COMPLETED: { variant: "success", label: "Completed" },
  PAUSED: { variant: "warning", label: "Paused" },
};

const tabs = [
  { label: "All", value: "all" },
  { label: "Planning", value: "PLANNING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const workspaceId = "mock-workspace-id";

  const { data: apiData, isLoading, isError } = useCampaigns({
    workspaceId,
    status: activeTab !== "all" ? activeTab : undefined,
  });

  const createCampaign = useCreateCampaign();
  const toast = useToast();

  const hasApiData = !isError && apiData?.data && apiData.data.length > 0;
  const campaigns = useMemo(() => {
    if (hasApiData) return apiData!.data;
    if (activeTab === "all") return placeholderCampaigns;
    return placeholderCampaigns.filter((c) => c.status === activeTab);
  }, [hasApiData, apiData, activeTab]);
  const isDemo = !isLoading && !hasApiData;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate(
      { name: formName, description: formDescription, status: "PLANNING" as const, workspaceId },
      {
        onSuccess: () => {
          toast.success("Campaign created", "Your campaign has been created.");
          setFormName("");
          setFormDescription("");
          setIsModalOpen(false);
        },
        onError: () => {
          toast.error("Failed to create campaign", "Please try again.");
        },
      }
    );
  };

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">Campaigns</h1>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
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

      {/* Demo Banner */}
      {isDemo && <DemoBanner />}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" height={120} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-8 h-8" />}
          title="No campaigns yet"
          description="Create a campaign to get started"
          action={
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Campaign
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const config = statusConfig[campaign.status] || statusConfig.PLANNING;
            const contentCount = campaign._count?.contents ?? 0;
            return (
              <Link
                key={campaign.id}
                href={`/strategy/campaigns/${campaign.id}`}
              >
                <Card hoverable padding="lg">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-primary" />
                    </div>
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
                      <div className="flex items-center gap-4 text-xs text-text-dark/40">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {contentCount} content pieces
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={campaign.status === "COMPLETED" ? 100 : campaign.status === "ACTIVE" ? 50 : 10}
                          size="sm"
                          variant={campaign.status === "COMPLETED" ? "success" : "default"}
                          className="flex-1"
                        />
                        <span className="text-xs font-medium text-text-dark/60 w-8 text-right">
                          {campaign.status === "COMPLETED" ? 100 : campaign.status === "ACTIVE" ? 50 : 10}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Campaign"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Name *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter campaign name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Description
            </label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Enter description (optional)"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
