"use client";

import { use } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Calendar, FileText, Megaphone } from "lucide-react";
import { ContentEditor } from "@/features/content/ContentEditor";
import { ContentType } from "@/types/content";

const campaignData: Record<string, { name: string; deadline: string; contentCount: number }> = {
  "campaign-launch-2025": { name: "Q1 Product Launch", deadline: "Mar 31, 2025", contentCount: 12 },
  "campaign-brand-awareness": { name: "Brand Awareness Drive", deadline: "Apr 30, 2025", contentCount: 8 },
  "campaign-partner": { name: "Partner Co-Marketing", deadline: "May 31, 2025", contentCount: 3 },
  "campaign-holiday": { name: "Holiday Rebranding Guide", deadline: "Dec 31, 2024", contentCount: 18 },
};

const defaultCampaign = { name: "Campaign", deadline: "TBD", contentCount: 0 };

const campaignOptions = Object.entries(campaignData).map(([id, c]) => ({
  value: id,
  label: c.name,
}));

export default function NewContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const campaign = campaignData[id] || defaultCampaign;

  const breadcrumbItems = [
    { label: "Strategy", href: "/strategy" },
    { label: "Campaigns", href: "/strategy/campaigns" },
    { label: campaign.name, href: `/strategy/campaigns/${id}` },
    { label: "New Content" },
  ];

  return (
    <div className="max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-dark">New Content</h1>
        <p className="text-sm text-text-dark/40">
          Create new content for {campaign.name}
        </p>
      </div>

      {/* Campaign Context Banner */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-dark">
              {campaign.name}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-dark/40">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Deadline: {campaign.deadline}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {campaign.contentCount} existing pieces
            </span>
          </div>
        </div>
      </Card>

      {/* Content Editor */}
      <ContentEditor
        campaignId={id}
        campaignOptions={campaignOptions}
        initialContentType={ContentType.BlogPost}
      />
    </div>
  );
}
