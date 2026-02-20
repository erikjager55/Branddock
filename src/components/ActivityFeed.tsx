/**
 * COMPONENT: ActivityFeed
 *
 * Notification panel — reads from Notification API via TanStack Query hooks.
 * Filter state managed by useShellStore.
 */

import React, { useState } from 'react';
import {
  Bell,
  X,
  Filter,
  CheckCheck,
  Trash2,
  Link,
  FlaskConical,
  Upload,
  Trophy,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  Lightbulb,
  UserPlus,
  Play,
  Circle,
} from 'lucide-react';
import { Button } from './ui/button';
import { useShellStore } from '../stores/useShellStore';
import {
  useNotifications,
  useNotificationCount,
  useMarkRead,
  useMarkAllRead,
  useClearNotifications,
} from '../hooks/use-notifications';
import type { NotificationItem } from '../types/notifications';
import type { NotificationType, NotificationCategory } from '@prisma/client';

interface ActivityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

const CATEGORY_FILTERS: { key: NotificationCategory | 'All'; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'BRAND_ASSETS', label: 'Brand Assets' },
  { key: 'RESEARCH', label: 'Research' },
  { key: 'PERSONAS', label: 'Personas' },
  { key: 'STRATEGY', label: 'Strategy' },
  { key: 'COLLABORATION', label: 'Collaboration' },
  { key: 'SYSTEM', label: 'System' },
];

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  BRAND_ASSETS: 'bg-emerald-100 text-emerald-700',
  RESEARCH: 'bg-blue-100 text-blue-700',
  PERSONAS: 'bg-purple-100 text-purple-700',
  STRATEGY: 'bg-amber-100 text-amber-700',
  COLLABORATION: 'bg-pink-100 text-pink-700',
  SYSTEM: 'bg-gray-100 text-gray-700',
};

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  DATA_RELATIONSHIP_CREATED: Link,
  RESEARCH_COMPLETED: FlaskConical,
  FILE_UPLOADED: Upload,
  MILESTONE_REACHED: Trophy,
  COMMENT_ADDED: MessageSquare,
  RESEARCH_PLAN_CREATED: ClipboardList,
  ASSET_STATUS_UPDATED: RefreshCw,
  RESEARCH_INSIGHT_ADDED: Lightbulb,
  NEW_PERSONA_CREATED: UserPlus,
  NEW_RESEARCH_STARTED: Play,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  DATA_RELATIONSHIP_CREATED: 'bg-emerald-100 text-emerald-600',
  RESEARCH_COMPLETED: 'bg-blue-100 text-blue-600',
  FILE_UPLOADED: 'bg-gray-100 text-gray-600',
  MILESTONE_REACHED: 'bg-amber-100 text-amber-600',
  COMMENT_ADDED: 'bg-pink-100 text-pink-600',
  RESEARCH_PLAN_CREATED: 'bg-indigo-100 text-indigo-600',
  ASSET_STATUS_UPDATED: 'bg-emerald-100 text-emerald-600',
  RESEARCH_INSIGHT_ADDED: 'bg-yellow-100 text-yellow-600',
  NEW_PERSONA_CREATED: 'bg-purple-100 text-purple-600',
  NEW_RESEARCH_STARTED: 'bg-blue-100 text-blue-600',
};

export function ActivityFeed({ isOpen, onClose, onNavigate }: ActivityFeedProps) {
  const { notificationFilter, showUnreadOnly, setNotificationFilter, toggleUnreadOnly } = useShellStore();
  const [showFilters, setShowFilters] = useState(false);

  const { data } = useNotifications({
    category: notificationFilter === 'All' ? undefined : notificationFilter,
    unreadOnly: showUnreadOnly || undefined,
    limit: 50,
  });

  const { data: countData } = useNotificationCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const clearAll = useClearNotifications();

  const notifications = data?.items ?? [];
  const unreadCount = countData?.count ?? 0;

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
    if (onNavigate && item.actionUrl) {
      onNavigate(item.actionUrl);
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleClearAll = () => {
    if (confirm('Clear all notifications? This cannot be undone.')) {
      clearAll.mutate();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-2xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8 w-8 p-0"
                title="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 pb-4 space-y-3">
              {/* Category filters */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Filter by category</div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setNotificationFilter(f.key)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        notificationFilter === f.key
                          ? f.key === 'All'
                            ? 'bg-primary text-primary-foreground'
                            : CATEGORY_COLORS[f.key]
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unread filter */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={() => toggleUnreadOnly()}
                  className="rounded border-border"
                />
                <span className="text-sm">Show unread only</span>
              </label>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    className="flex-1 h-8"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    className="flex-1 h-8"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="h-[calc(100%-65px)] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                {showUnreadOnly
                  ? 'No unread notifications'
                  : 'Notifications will appear here as you work'
                }
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((item) => {
                const Icon = TYPE_ICONS[item.type] || Circle;
                const colorClass = TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-600';

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`w-full relative flex items-start gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                      !item.isRead
                        ? 'bg-blue-50 hover:bg-blue-100/80'
                        : 'hover:bg-accent/30'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Unread indicator */}
                    {!item.isRead && (
                      <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.actorName && (
                          <>
                            <span>{item.actorName}</span>
                            <span>&middot;</span>
                          </>
                        )}
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function formatTimeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
