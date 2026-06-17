// =============================================================
// Competitor Activity types — shared between API + UI.
// =============================================================

import type { CompetitorActivityType, ActivitySeverity } from "@prisma/client";

export type { CompetitorActivityType, ActivitySeverity };

export interface ActivityListItem {
  id: string;
  type: CompetitorActivityType;
  severity: ActivitySeverity;
  summary: string;
  detectedAt: string;
  detectionMethod: string;
  confidence: number | null;
  snapshotId: string | null;
  diffPayload: unknown;
  acknowledgedAt: string | null;
  acknowledgedBy: { id: string; name: string | null } | null;
}

export interface ActivityListResponse {
  items: ActivityListItem[];
  total: number;
  /** Unread count within the active filter — matches the visible list. */
  unreadCount: number;
  /** Unread count across ALL activities for this competitor, ignoring filters —
   *  drives the badge + "Mark all as read" enable-gate (the action is unfiltered). */
  totalUnread: number;
}

export interface ActivitySummaryCompetitor {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface ActivitySummaryEvent extends ActivityListItem {
  competitor: ActivitySummaryCompetitor;
}

export interface ActivitySummaryResponse {
  window: "7d" | "30d";
  totals: { major: number; notable: number; info: number };
  topEvents: ActivitySummaryEvent[];
  hotCompetitors: Array<ActivitySummaryCompetitor & { unackCount: number }>;
}

export interface ActivityFilters {
  severity?: ActivitySeverity;
  detectionMethod?: string;
  type?: CompetitorActivityType;
  offset?: number;
  limit?: number;
}

/** Display labels per CompetitorActivityType — used by UI list rows and notifications. */
export const ACTIVITY_TYPE_LABEL: Record<CompetitorActivityType, string> = {
  TAGLINE_CHANGED: "Tagline changed",
  VALUE_PROP_CHANGED: "Value proposition changed",
  TARGET_AUDIENCE_CHANGED: "Target audience shifted",
  CATEGORY_REPOSITIONING: "Category repositioning",
  NEW_PRODUCT: "New product",
  PRODUCT_REMOVED: "Product removed",
  PRICING_CHANGED: "Pricing changed",
  NEW_OFFERING: "New offering",
  NEW_BLOG_POST: "New blog post",
  NEW_PRESS_RELEASE: "New press release",
  NEW_CASE_STUDY: "New case study",
  NEW_FORMAT_EMERGING: "New content format",
  HIRING_SIGNAL: "Hiring signal",
  HEADCOUNT_RANGE_CHANGED: "Headcount range changed",
  FUNDING_EVENT: "Funding event",
  LEADERSHIP_CHANGE: "Leadership change",
  VISUAL_REBRAND: "Visual rebrand",
  SOCIAL_PRESENCE_CHANGE: "Social presence changed",
  STATUS_CHANGED: "Status changed",
  TIER_CHANGED: "Tier changed",
  USER_ANNOTATED: "Manual annotation",
};
