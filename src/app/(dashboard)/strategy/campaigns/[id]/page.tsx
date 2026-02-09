"use client";

import { use } from "react";
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

// Placeholder campaign data
const campaignData: Record<
  string,
  {
    name: string;
    status: "planning" | "active" | "completed";
    startDate: string;
    endDate: string;
    progress: number;
    description: string;
    metrics: { reach: string; engagement: string; contentPieces: number };
    content: {
      id: string;
      title: string;
      type: string;
      status: string;
      date: string;
    }[];
  }
> = {
  "campaign-launch-2025": {
    name: "Q1 Product Launch",
    status: "active",
    startDate: "Jan 15, 2025",
    endDate: "Mar 31, 2025",
    progress: 65,
    description:
      "Major product launch campaign targeting enterprise marketing teams with new AI-powered features. Includes blog posts, social media, email sequences, and webinars.",
    metrics: { reach: "45.2K", engagement: "8.7%", contentPieces: 12 },
    content: [
      { id: "c1", title: "Launch Announcement Blog Post", type: "Blog", status: "Published", date: "Jan 20, 2025" },
      { id: "c2", title: "Product Demo Video", type: "Video", status: "Published", date: "Jan 22, 2025" },
      { id: "c3", title: "Feature Deep Dive: AI Analysis", type: "Blog", status: "Published", date: "Feb 1, 2025" },
      { id: "c4", title: "Customer Success Story", type: "Case Study", status: "In Review", date: "Feb 10, 2025" },
      { id: "c5", title: "Email Sequence: Trial Users", type: "Email", status: "Draft", date: "Feb 15, 2025" },
      { id: "c6", title: "Webinar: Brand Strategy 2025", type: "Webinar", status: "Planned", date: "Mar 5, 2025" },
    ],
  },
  "campaign-brand-awareness": {
    name: "Brand Awareness Drive",
    status: "active",
    startDate: "Feb 1, 2025",
    endDate: "Apr 30, 2025",
    progress: 35,
    description:
      "Multi-channel awareness campaign to establish Branddock as a thought leader in brand management space.",
    metrics: { reach: "28.1K", engagement: "5.3%", contentPieces: 8 },
    content: [
      { id: "c7", title: "State of Brand Management Report", type: "Report", status: "Published", date: "Feb 5, 2025" },
      { id: "c8", title: "LinkedIn Thought Leadership Series", type: "Social", status: "In Progress", date: "Feb 10, 2025" },
      { id: "c9", title: "Guest Post: Forbes", type: "Blog", status: "In Review", date: "Feb 20, 2025" },
    ],
  },
};

// Fallback for unknown campaigns
const defaultCampaign = {
  name: "Campaign",
  status: "planning" as const,
  startDate: "TBD",
  endDate: "TBD",
  progress: 0,
  description: "Campaign details will appear here.",
  metrics: { reach: "—", engagement: "—", contentPieces: 0 },
  content: [],
};

const statusConfig: Record<string, { variant: "info" | "success" | "default"; label: string }> = {
  planning: { variant: "default", label: "Planning" },
  active: { variant: "info", label: "Active" },
  completed: { variant: "success", label: "Completed" },
};

const contentStatusConfig: Record<string, { variant: "success" | "info" | "warning" | "default" }> = {
  Published: { variant: "success" },
  "In Progress": { variant: "info" },
  "In Review": { variant: "warning" },
  Draft: { variant: "default" },
  Planned: { variant: "default" },
};

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const campaign = campaignData[id] || defaultCampaign;
  const config = statusConfig[campaign.status];

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
                {campaign.startDate} — {campaign.endDate}
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
        <p className="text-sm text-text-dark/60">{campaign.description}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-dark/40">
              Overall Progress
            </span>
            <span className="text-xs font-medium text-text-dark">
              {campaign.progress}%
            </span>
          </div>
          <ProgressBar
            value={campaign.progress}
            variant={campaign.progress === 100 ? "success" : "default"}
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
              <p className="text-2xl font-bold text-text-dark">
                {campaign.metrics.reach}
              </p>
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
              <p className="text-2xl font-bold text-text-dark">
                {campaign.metrics.engagement}
              </p>
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
                {campaign.metrics.contentPieces}
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
          {campaign.content.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-text-dark/20 mx-auto mb-3" />
                <p className="text-sm text-text-dark/40">
                  No content yet. Add your first piece of content to this campaign.
                </p>
              </div>
            </Card>
          ) : (
            campaign.content.map((item) => {
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
                        {item.status}
                      </Badge>
                      <span className="text-xs text-text-dark/40 flex-shrink-0">
                        {item.date}
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
