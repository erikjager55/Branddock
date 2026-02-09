"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import Link from "next/link";
import {
  Edit,
  Plus,
  Calendar,
  Eye,
  Heart,
  FileText,
  Megaphone,
} from "lucide-react";
import { useCampaign, CampaignContent } from "@/hooks/api/useCampaigns";

const statusConfig: Record<string, { variant: "info" | "success" | "default" | "warning"; label: string }> = {
  DRAFT: { variant: "default", label: "Draft" },
  PLANNING: { variant: "default", label: "Planning" },
  ACTIVE: { variant: "info", label: "Active" },
  COMPLETED: { variant: "success", label: "Completed" },
  PAUSED: { variant: "warning", label: "Paused" },
  ARCHIVED: { variant: "default", label: "Archived" },
};

const contentStatusConfig: Record<string, { variant: "success" | "info" | "warning" | "default" }> = {
  PUBLISHED: { variant: "success" },
  APPROVED: { variant: "success" },
  IN_REVIEW: { variant: "warning" },
  DRAFT: { variant: "default" },
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getProgress(status: string) {
  switch (status) {
    case "COMPLETED": return 100;
    case "ACTIVE": return 50;
    case "PAUSED": return 30;
    default: return 10;
  }
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading, isError } = useCampaign(id);

  if (isLoading) {
    return (
      <div className="max-w-[1400px]">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-surface-dark rounded w-1/3" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-dark" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-surface-dark rounded w-1/3" />
              <div className="h-4 bg-surface-dark rounded w-1/4" />
            </div>
          </div>
          <div className="h-32 bg-surface-dark rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-surface-dark rounded" />
            <div className="h-24 bg-surface-dark rounded" />
            <div className="h-24 bg-surface-dark rounded" />
          </div>
          <div className="h-48 bg-surface-dark rounded" />
        </div>
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="max-w-[1400px]">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-dark mb-2">
            Campaign not found
          </h2>
          <p className="text-text-dark/60 mb-4">
            The campaign you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push("/strategy/campaigns")}
          >
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  const config = statusConfig[campaign.status] || statusConfig.DRAFT;
  const progress = getProgress(campaign.status);
  const contentItems: CampaignContent[] = campaign.content || [];
  const contentCount = campaign._count?.contents ?? campaign._count?.content ?? contentItems.length;

  const breadcrumbItems = [
    { label: "Strategy", href: "/strategy" },
    { label: "Campaigns", href: "/strategy/campaigns" },
    { label: campaign.name },
  ];

  return (
    <div className="max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-text-dark">
                {campaign.name}
              </h1>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-dark/40">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" leftIcon={<Edit className="w-4 h-4" />}>
          Edit Campaign
        </Button>
      </div>

      {/* Description */}
      <Card padding="lg" className="mb-6">
        <p className="text-sm text-text-dark/60">
          {campaign.description || "No description provided."}
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-dark/40">
              Overall Progress
            </span>
            <span className="text-xs font-medium text-text-dark">
              {progress}%
            </span>
          </div>
          <ProgressBar
            value={progress}
            variant={progress === 100 ? "success" : "default"}
          />
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">&mdash;</p>
              <p className="text-xs text-text-dark/40">Total Reach</p>
            </div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">&mdash;</p>
              <p className="text-xs text-text-dark/40">Engagement Rate</p>
            </div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-dark">
                {contentCount}
              </p>
              <p className="text-xs text-text-dark/40">Content Pieces</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Content List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">
            Campaign Content
          </h2>
          <Link href={`/strategy/campaigns/${id}/content/new`}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Content
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {contentItems.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-text-dark/20 mx-auto mb-3" />
                <p className="text-sm text-text-dark/40">
                  No content yet. Add your first piece of content to this
                  campaign.
                </p>
              </div>
            </Card>
          ) : (
            contentItems.map((item) => {
              const cs = contentStatusConfig[item.status] || {
                variant: "default" as const,
              };
              return (
                <Link
                  key={item.id}
                  href={`/strategy/campaigns/${id}/content/${item.id}`}
                >
                  <Card hoverable padding="md">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-text-dark/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-text-dark truncate">
                          {item.title}
                        </h4>
                      </div>
                      <Badge variant="default" size="sm">
                        {item.type}
                      </Badge>
                      <Badge variant={cs.variant} size="sm">
                        {item.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-text-dark/40 flex-shrink-0">
                        {formatDate(item.updatedAt)}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
