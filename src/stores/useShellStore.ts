import { create } from "zustand";
import type { NotificationCategory } from "@/types/notifications";

interface ShellStore {
  // Search Modal
  isSearchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;

  // Notification Panel
  isNotificationPanelOpen: boolean;
  notificationFilter: NotificationCategory | "All";
  showUnreadOnly: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  setNotificationFilter: (f: NotificationCategory | "All") => void;
  toggleUnreadOnly: () => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  // Search
  isSearchOpen: false,
  searchQuery: "",
  openSearch: () => set({ isSearchOpen: true, searchQuery: "" }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: "" }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Notifications
  isNotificationPanelOpen: false,
  notificationFilter: "All",
  showUnreadOnly: false,
  openNotifications: () => set({ isNotificationPanelOpen: true }),
  closeNotifications: () => set({ isNotificationPanelOpen: false }),
  setNotificationFilter: (f) => set({ notificationFilter: f }),
  toggleUnreadOnly: () => set((s) => ({ showUnreadOnly: !s.showUnreadOnly })),
}));
