import { create } from 'zustand';
import type { NotificationCategory } from '@prisma/client';

interface ShellStore {
  // Notifications
  isNotificationPanelOpen: boolean;
  notificationFilter: NotificationCategory | 'All';
  showUnreadOnly: boolean;

  // Search
  isSearchModalOpen: boolean;
  searchQuery: string;

  // Actions
  openNotifications: () => void;
  closeNotifications: () => void;
  setNotificationFilter: (filter: NotificationCategory | 'All') => void;
  toggleUnreadOnly: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  isNotificationPanelOpen: false,
  notificationFilter: 'All',
  showUnreadOnly: false,

  isSearchModalOpen: false,
  searchQuery: '',

  openNotifications: () => set({ isNotificationPanelOpen: true }),
  closeNotifications: () => set({ isNotificationPanelOpen: false }),
  setNotificationFilter: (filter) => set({ notificationFilter: filter }),
  toggleUnreadOnly: () => set((s) => ({ showUnreadOnly: !s.showUnreadOnly })),
  openSearch: () => set({ isSearchModalOpen: true }),
  closeSearch: () => set({ isSearchModalOpen: false, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
