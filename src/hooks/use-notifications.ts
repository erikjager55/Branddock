import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchNotificationCount,
  markAsRead,
  markAllRead,
  clearNotifications,
} from '@/lib/api/notifications';
import type { NotificationsResponse, NotificationsParams } from '@/types/notifications';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationsParams) => ['notifications', 'list', params ?? {}] as const,
  count: ['notifications', 'count'] as const,
};

export function useNotifications(params?: NotificationsParams) {
  return useQuery<NotificationsResponse>({
    queryKey: notificationKeys.list(params),
    queryFn: () => fetchNotifications(params),
    staleTime: 15_000,
  });
}

export function useNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: notificationKeys.count,
    queryFn: fetchNotificationCount,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useClearNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
