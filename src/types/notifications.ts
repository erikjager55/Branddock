// =============================================================
// Notification Types (S8)
// =============================================================

import type { NotificationType, NotificationCategory } from '@prisma/client';

export type { NotificationType, NotificationCategory };

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

export interface NotificationsParams {
  category?: NotificationCategory;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
}
