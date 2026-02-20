import { NextResponse } from "next/server";

// GET /api/campaigns/wizard/deliverable-types — Return available deliverable types
const DELIVERABLE_TYPES = [
  { id: "blog-article", label: "Blog Article", category: "written" },
  { id: "social-post", label: "Social Post", category: "social" },
  { id: "email-newsletter", label: "Email Newsletter", category: "email" },
  { id: "whitepaper", label: "Whitepaper", category: "written" },
  { id: "case-study", label: "Case Study", category: "written" },
  { id: "infographic", label: "Infographic", category: "visual" },
  { id: "video-script", label: "Video Script", category: "video" },
  { id: "linkedin-post", label: "LinkedIn Post", category: "social" },
  { id: "twitter-thread", label: "Twitter Thread", category: "social" },
  { id: "instagram-post", label: "Instagram Post", category: "social" },
  { id: "presentation", label: "Presentation", category: "visual" },
  { id: "brand-guidelines", label: "Brand Guidelines", category: "visual" },
  { id: "welcome-email", label: "Welcome Email", category: "email" },
  { id: "promotional-email", label: "Promotional Email", category: "email" },
  { id: "drip-campaign", label: "Drip Campaign", category: "email" },
  { id: "banner", label: "Banner", category: "visual" },
];

export async function GET() {
  return NextResponse.json(DELIVERABLE_TYPES);
}
