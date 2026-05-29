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
  TAGLINE_CHANGED: "Tagline gewijzigd",
  VALUE_PROP_CHANGED: "Value proposition gewijzigd",
  TARGET_AUDIENCE_CHANGED: "Doelgroep verschoven",
  CATEGORY_REPOSITIONING: "Categorie-repositionering",
  NEW_PRODUCT: "Nieuw product",
  PRODUCT_REMOVED: "Product verwijderd",
  PRICING_CHANGED: "Pricing gewijzigd",
  NEW_OFFERING: "Nieuwe propositie",
  NEW_BLOG_POST: "Nieuwe blogpost",
  NEW_PRESS_RELEASE: "Nieuw persbericht",
  NEW_CASE_STUDY: "Nieuwe case study",
  NEW_FORMAT_EMERGING: "Nieuw content-format",
  HIRING_SIGNAL: "Hiring-signaal",
  HEADCOUNT_RANGE_CHANGED: "Headcount-range gewijzigd",
  FUNDING_EVENT: "Funding-event",
  LEADERSHIP_CHANGE: "Leiderschapswijziging",
  VISUAL_REBRAND: "Visuele rebrand",
  SOCIAL_PRESENCE_CHANGE: "Social presence gewijzigd",
  STATUS_CHANGED: "Status gewijzigd",
  TIER_CHANGED: "Tier gewijzigd",
  USER_ANNOTATED: "Handmatige annotatie",
};
