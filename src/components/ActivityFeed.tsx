/**
 * COMPONENT: ActivityFeed
 * 
 * Displays a timeline of all activities with filtering and grouping.
 */

import React, { useState, useEffect } from 'react';
import { Bell, X, Filter, CheckCheck, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { activityService } from '../services/ActivityService';
import { Activity, ActivityGroup, ActivityCategory } from '../types/activity';
import { Button } from './ui/button';

interface ActivityFeedProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string, metadata?: any) => void;
}

export function ActivityFeed({ isOpen, onClose, onNavigate }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groupedActivities, setGroupedActivities] = useState<ActivityGroup[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ActivityCategory[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Load activities
    loadActivities();

    // Subscribe to changes
    const unsubscribe = activityService.subscribe(() => {
      loadActivities();
    });

    return unsubscribe;
  }, [selectedCategories, showUnreadOnly]);

  const loadActivities = () => {
    const filter = {
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      showUnreadOnly
    };

    const allActivities = activityService.getActivities(filter);
    const grouped = activityService.getActivitiesGrouped(filter);

    setActivities(allActivities);
    setGroupedActivities(grouped);
  };

  const handleActivityClick = (activity: Activity) => {
    // Mark as read
    activityService.markAsRead(activity.id);

    // Navigate if applicable
    if (onNavigate && activity.metadata) {
      if (activity.metadata.assetId) {
        onNavigate(`brand-${activity.metadata.assetId}`, activity.metadata);
      } else if (activity.metadata.personaId) {
        onNavigate(`persona-${activity.metadata.personaId}`, activity.metadata);
      } else if (activity.metadata.planId) {
        onNavigate('research-plans', activity.metadata);
      }
    }
  };

  const handleMarkAllRead = () => {
    activityService.markAllAsRead();
  };

  const handleClearAll = () => {
    if (confirm('Clear all activities? This cannot be undone.')) {
      activityService.clear();
    }
  };

  const toggleCategory = (category: ActivityCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const unreadCount = activityService.getUnreadCount();

  const categories: ActivityCategory[] = ['brand', 'research', 'personas', 'strategy', 'collaboration', 'system'];

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
              <h2 className="font-semibold">Activity Feed</h2>
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
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        selectedCategories.includes(category)
                          ? activityService.getActivityColor(category)
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {activityService.getCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unread filter */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
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
                {activities.length > 0 && (
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
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No activities yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {showUnreadOnly 
                  ? 'No unread activities'
                  : 'Activities will appear here as you work'
                }
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* Timeline */}
              {groupedActivities.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-6 last:mb-0">
                  {/* Date header */}
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 mb-3 z-10">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      {group.date}
                    </h3>
                  </div>

                  {/* Activities */}
                  <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {group.activities.map((activity, index) => {
                      const Icon = (LucideIcons as any)[activityService.getActivityIcon(activity.type)];
                      const colorClass = activityService.getActivityColor(activity.category);

                      return (
                        <div
                          key={activity.id}
                          onClick={() => handleActivityClick(activity)}
                          className={`relative pl-10 pr-2 py-2 rounded-lg transition-colors cursor-pointer ${
                            !activity.isRead 
                              ? 'bg-accent/50 hover:bg-accent' 
                              : 'hover:bg-accent/30'
                          }`}
                        >
                          {/* Timeline dot with icon */}
                          <div className={`absolute left-0 top-2 h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                            {Icon && <Icon className="h-4 w-4" />}
                          </div>

                          {/* Unread indicator */}
                          {!activity.isRead && (
                            <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                          )}

                          {/* Content */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-tight">
                                {activity.title}
                              </p>
                            </div>

                            {activity.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {activity.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{activity.user.name}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(activity.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper function
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
