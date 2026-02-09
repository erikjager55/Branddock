"use client";

import { use } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ContentEditor } from "@/features/content/ContentEditor";
import { ContentType, ContentStatus } from "@/types/content";

const campaignData: Record<string, { name: string }> = {
  "campaign-launch-2025": { name: "Q1 Product Launch" },
  "campaign-brand-awareness": { name: "Brand Awareness Drive" },
  "campaign-partner": { name: "Partner Co-Marketing" },
  "campaign-holiday": { name: "Holiday Rebranding Guide" },
};

const contentData: Record<
  string,
  {
    title: string;
    body: string;
    type: ContentType;
    status: ContentStatus;
    tags: string[];
    onBrand: boolean;
    analysisScores: { tone: string; readability: number; brandAlignment: number };
    versionHistory: { version: string; date: string; author: string }[];
  }
> = {
  c1: {
    title: "Launch Announcement Blog Post",
    body: `We're thrilled to announce the launch of our newest features, designed specifically for enterprise marketing teams who need AI-powered brand management.\n\nAfter months of development and extensive beta testing with over 50 brands, we're confident that these new capabilities will transform how teams approach brand consistency.\n\nKey highlights:\n- AI-powered brand voice analysis that scores content alignment in real-time\n- Automated campaign workflows with intelligent scheduling\n- Advanced analytics dashboard with predictive insights\n- Seamless integration with your existing marketing stack\n\nOur mission has always been to make brand management accessible and data-driven. With this launch, we're taking a significant step forward in delivering on that promise.`,
    type: ContentType.BlogPost,
    status: ContentStatus.Published,
    tags: ["Launch", "Product", "AI", "Enterprise"],
    onBrand: true,
    analysisScores: { tone: "Professional", readability: 82, brandAlignment: 91 },
    versionHistory: [
      { version: "v3 — Published", date: "Jan 20, 2025", author: "Erik J." },
      { version: "v2 — Reviewed", date: "Jan 18, 2025", author: "Sarah M." },
      { version: "v1 — Draft", date: "Jan 15, 2025", author: "Erik J." },
    ],
  },
  c2: {
    title: "Product Demo Video",
    body: "Script for the product demo video showcasing the new AI-powered features. Target length: 3 minutes.\n\nOpening: Problem statement — brand inconsistency costs companies millions\nMiddle: Feature walkthrough — AI analysis, campaign workflows, analytics\nClosing: Call to action — start free trial",
    type: ContentType.Video,
    status: ContentStatus.Published,
    tags: ["Demo", "Video", "Product"],
    onBrand: true,
    analysisScores: { tone: "Conversational", readability: 88, brandAlignment: 85 },
    versionHistory: [
      { version: "v2 — Published", date: "Jan 22, 2025", author: "Erik J." },
      { version: "v1 — Draft", date: "Jan 19, 2025", author: "Erik J." },
    ],
  },
  c3: {
    title: "Feature Deep Dive: AI Analysis",
    body: "An in-depth look at how our AI analysis engine works under the hood, and how it helps brands maintain consistency across all touchpoints.\n\nTopics to cover:\n1. Natural language processing for brand voice detection\n2. Visual consistency scoring\n3. Cross-channel alignment monitoring\n4. Actionable recommendations engine",
    type: ContentType.BlogPost,
    status: ContentStatus.Published,
    tags: ["AI", "Technical", "Deep Dive"],
    onBrand: true,
    analysisScores: { tone: "Educational", readability: 75, brandAlignment: 88 },
    versionHistory: [
      { version: "v2 — Published", date: "Feb 1, 2025", author: "Sarah M." },
      { version: "v1 — Draft", date: "Jan 28, 2025", author: "Erik J." },
    ],
  },
  c5: {
    title: "Email Sequence: Trial Users",
    body: "Day 1: Welcome email — introduce key features\nDay 3: Quick win — show how to set up brand foundation\nDay 7: Power user tip — campaign creation workflow\nDay 14: Check-in — offer demo call\nDay 21: Conversion — special offer for annual plan",
    type: ContentType.Email,
    status: ContentStatus.Draft,
    tags: ["Email", "Onboarding", "Trial"],
    onBrand: false,
    analysisScores: { tone: "Friendly", readability: 90, brandAlignment: 62 },
    versionHistory: [
      { version: "v1 — Draft", date: "Feb 15, 2025", author: "Erik J." },
    ],
  },
};

const defaultContent = {
  title: "Untitled Content",
  body: "",
  type: ContentType.BlogPost,
  status: ContentStatus.Draft,
  tags: [],
  onBrand: true,
  analysisScores: { tone: "Neutral", readability: 0, brandAlignment: 0 },
  versionHistory: [],
};

const campaignOptions = Object.entries(campaignData).map(([id, c]) => ({
  value: id,
  label: c.name,
}));

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string; contentId: string }>;
}) {
  const { id, contentId } = use(params);
  const campaign = campaignData[id] || { name: "Campaign" };
  const content = contentData[contentId] || defaultContent;

  const breadcrumbItems = [
    { label: "Strategy", href: "/strategy" },
    { label: "Campaigns", href: "/strategy/campaigns" },
    { label: campaign.name, href: `/strategy/campaigns/${id}` },
    { label: content.title },
  ];

  return (
    <div className="max-w-[1400px]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Content Editor */}
      <ContentEditor
        initialTitle={content.title}
        initialBody={content.body}
        initialContentType={content.type}
        initialStatus={content.status}
        initialTags={content.tags}
        initialOnBrand={content.onBrand}
        campaignId={id}
        campaignOptions={campaignOptions}
        analysisScores={content.analysisScores}
        versionHistory={content.versionHistory}
      />
    </div>
  );
}
