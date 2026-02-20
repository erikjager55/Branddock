import type {
  NotificationsResponse,
  NotificationsParams,
} from '@/types/notifications';

export async function fetchNotifications(params?: NotificationsParams): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  const res = await fetch(`/api/notifications${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function fetchNotificationCount(): Promise<{ count: number }> {
  const res = await fetch('/api/notifications/count');
  if (!res.ok) throw new Error('Failed to fetch notification count');
  return res.json();
}

export async function markAsRead(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

export async function markAllRead(): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
  return res.json();
}

export async function clearNotifications(): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/notifications/clear', {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to clear notifications');
  return res.json();
}
