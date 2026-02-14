export type NotificationType =
  | "DATA_RELATIONSHIP_CREATED"
  | "RESEARCH_COMPLETED"
  | "FILE_UPLOADED"
  | "MILESTONE_REACHED"
  | "COMMENT_ADDED"
  | "RESEARCH_PLAN_CREATED"
  | "ASSET_STATUS_UPDATED"
  | "RESEARCH_INSIGHT_ADDED"
  | "NEW_PERSONA_CREATED"
  | "NEW_RESEARCH_STARTED";

export type NotificationCategory =
  | "BRAND_ASSETS"
  | "RESEARCH"
  | "PERSONAS"
  | "STRATEGY"
  | "COLLABORATION"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string | null;
  category: NotificationCategory;
  isRead: boolean;
  actionUrl: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface NotificationEventConfig {
  type: NotificationType;
  icon: string;       // Lucide icon name
  bg: string;         // bg-{color}-100
  iconColor: string;  // text-{color}-600
}
