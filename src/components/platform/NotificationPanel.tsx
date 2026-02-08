"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  CheckCircle,
  Target,
  FileText,
  Users,
  AlertTriangle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  group: "today" | "yesterday" | "earlier";
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    title: "Campaign approved",
    description: "Brand Awareness Q1 campaign was approved by Admin.",
    timestamp: "10 min ago",
    read: false,
    group: "today",
  },
  {
    id: "2",
    icon: <FileText className="w-4 h-4 text-blue-400" />,
    title: "Content ready for review",
    description: "3 new blog posts are waiting for your review.",
    timestamp: "1 hour ago",
    read: false,
    group: "today",
  },
  {
    id: "3",
    icon: <Users className="w-4 h-4 text-purple-400" />,
    title: "New team member",
    description: "Sarah joined the workspace as Editor.",
    timestamp: "3 hours ago",
    read: false,
    group: "today",
  },
  {
    id: "4",
    icon: <Target className="w-4 h-4 text-amber-400" />,
    title: "Research completed",
    description: "Market validation survey results are in.",
    timestamp: "Yesterday, 4:30 PM",
    read: true,
    group: "yesterday",
  },
  {
    id: "5",
    icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
    title: "Brand score dropped",
    description: "Brand Health Score decreased by 5 points.",
    timestamp: "Yesterday, 10:15 AM",
    read: true,
    group: "yesterday",
  },
  {
    id: "6",
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    title: "Persona created",
    description: "CMO Persona was successfully generated.",
    timestamp: "2 days ago",
    read: true,
    group: "earlier",
  },
  {
    id: "7",
    icon: <FileText className="w-4 h-4 text-blue-400" />,
    title: "Content published",
    description: "Blog post 'Brand Strategy 101' is now live.",
    timestamp: "3 days ago",
    read: true,
    group: "earlier",
  },
];

const groupLabels: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const groups = ["today", "yesterday", "earlier"].filter((g) =>
    notifications.some((n) => n.group === g)
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm border-l border-border-dark bg-surface-dark shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-border-dark flex-shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-dark">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary-400 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-text-dark/50 hover:text-text-dark hover:bg-background-dark transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <CheckCircle className="w-12 h-12 text-text-dark/20 mb-3" />
                  <p className="text-text-dark/60 font-medium">All caught up!</p>
                  <p className="text-sm text-text-dark/40 mt-1">No new notifications.</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group}>
                    <div className="px-4 py-2 bg-background-dark/50">
                      <span className="text-xs font-medium text-text-dark/40 uppercase tracking-wider">
                        {groupLabels[group]}
                      </span>
                    </div>
                    {notifications
                      .filter((n) => n.group === group)
                      .map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => markAsRead(notification.id)}
                          className={cn(
                            "w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-background-dark/50",
                            !notification.read && "bg-primary/[0.03]"
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {notification.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-sm",
                                  notification.read
                                    ? "text-text-dark/70"
                                    : "text-text-dark font-medium"
                                )}
                              >
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-text-dark/50 mt-0.5 line-clamp-2">
                              {notification.description}
                            </p>
                            <p className="text-xs text-text-dark/30 mt-1">
                              {notification.timestamp}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useNotificationCount() {
  return initialNotifications.filter((n) => !n.read).length;
}
