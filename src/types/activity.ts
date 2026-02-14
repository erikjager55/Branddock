/**
 * TYPES: Activity Feed & Timeline
 * 
 * Defines all activity types and structures for the activity feed system.
 */

export type ActivityType = 
  | 'asset-created'
  | 'asset-updated'
  | 'asset-approved'
  | 'asset-rejected'
  | 'persona-created'
  | 'persona-updated'
  | 'research-started'
  | 'research-completed'
  | 'plan-created'
  | 'plan-updated'
  | 'comment-added'
  | 'file-uploaded'
  | 'insight-added'
  | 'relationship-created'
  | 'status-changed'
  | 'team-member-added'
  | 'milestone-reached';

export type ActivityCategory = 
  | 'brand'
  | 'research'
  | 'personas'
  | 'strategy'
  | 'collaboration'
  | 'system';

export interface ActivityUser {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

export interface ActivityMetadata {
  assetId?: string;
  assetTitle?: string;
  personaId?: string;
  personaName?: string;
  planId?: string;
  planTitle?: string;
  fromStatus?: string;
  toStatus?: string;
  commentText?: string;
  fileName?: string;
  insightText?: string;
  milestoneType?: string;
  [key: string]: any;
}

export interface Activity {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  title: string;
  description?: string;
  user: ActivityUser;
  timestamp: number;
  metadata?: ActivityMetadata;
  isRead?: boolean;
  isImportant?: boolean;
}

export interface ActivityGroup {
  date: string; // e.g., "Today", "Yesterday", "Jan 15, 2024"
  activities: Activity[];
}

export interface ActivityFilter {
  categories?: ActivityCategory[];
  types?: ActivityType[];
  users?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  showUnreadOnly?: boolean;
}
