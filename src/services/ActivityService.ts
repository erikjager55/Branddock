/**
 * SERVICE: Activity Feed Service
 * 
 * Manages activity tracking, storage, and retrieval.
 */

import { Activity, ActivityType, ActivityCategory, ActivityUser, ActivityMetadata, ActivityGroup, ActivityFilter } from '../types/activity';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'research-tool-activities';
const MAX_ACTIVITIES = 100;

class ActivityService {
  private activities: Activity[] = [];
  private listeners: ((activities: Activity[]) => void)[] = [];

  constructor() {
    this.loadActivities();
  }

  /**
   * Add a new activity
   */
  addActivity(
    type: ActivityType,
    category: ActivityCategory,
    title: string,
    user: ActivityUser,
    metadata?: ActivityMetadata,
    options?: {
      description?: string;
      isImportant?: boolean;
    }
  ): Activity {
    const activity: Activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      title,
      description: options?.description,
      user,
      timestamp: Date.now(),
      metadata,
      isRead: false,
      isImportant: options?.isImportant || false
    };

    this.activities.unshift(activity); // Add to beginning

    // Keep only MAX_ACTIVITIES
    if (this.activities.length > MAX_ACTIVITIES) {
      this.activities = this.activities.slice(0, MAX_ACTIVITIES);
    }

    this.saveActivities();
    this.notifyListeners();
    
    logger.info('Activity added', { type, category, title });
    
    return activity;
  }

  /**
   * Get all activities
   */
  getActivities(filter?: ActivityFilter): Activity[] {
    let filtered = [...this.activities];

    if (filter) {
      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        filtered = filtered.filter(a => filter.categories!.includes(a.category));
      }

      // Filter by types
      if (filter.types && filter.types.length > 0) {
        filtered = filtered.filter(a => filter.types!.includes(a.type));
      }

      // Filter by users
      if (filter.users && filter.users.length > 0) {
        filtered = filtered.filter(a => filter.users!.includes(a.user.id));
      }

      // Filter by date range
      if (filter.dateRange) {
        filtered = filtered.filter(a => 
          a.timestamp >= filter.dateRange!.start && 
          a.timestamp <= filter.dateRange!.end
        );
      }

      // Filter unread only
      if (filter.showUnreadOnly) {
        filtered = filtered.filter(a => !a.isRead);
      }
    }

    return filtered;
  }

  /**
   * Get activities grouped by date
   */
  getActivitiesGrouped(filter?: ActivityFilter): ActivityGroup[] {
    const activities = this.getActivities(filter);
    const groups = new Map<string, Activity[]>();

    activities.forEach(activity => {
      const dateLabel = this.getDateLabel(activity.timestamp);
      
      if (!groups.has(dateLabel)) {
        groups.set(dateLabel, []);
      }
      
      groups.get(dateLabel)!.push(activity);
    });

    return Array.from(groups.entries()).map(([date, activities]) => ({
      date,
      activities
    }));
  }

  /**
   * Mark activity as read
   */
  markAsRead(activityId: string): void {
    const activity = this.activities.find(a => a.id === activityId);
    if (activity) {
      activity.isRead = true;
      this.saveActivities();
      this.notifyListeners();
    }
  }

  /**
   * Mark all activities as read
   */
  markAllAsRead(): void {
    this.activities.forEach(a => a.isRead = true);
    this.saveActivities();
    this.notifyListeners();
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.activities.filter(a => !a.isRead).length;
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities = [];
    this.saveActivities();
    this.notifyListeners();
  }

  /**
   * Subscribe to activity changes
   */
  subscribe(listener: (activities: Activity[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get activity icon based on type
   */
  getActivityIcon(type: ActivityType): string {
    const iconMap: Record<ActivityType, string> = {
      'asset-created': 'Plus',
      'asset-updated': 'Edit',
      'asset-approved': 'CheckCircle',
      'asset-rejected': 'XCircle',
      'persona-created': 'UserPlus',
      'persona-updated': 'UserCog',
      'research-started': 'PlayCircle',
      'research-completed': 'CheckCircle2',
      'plan-created': 'FileText',
      'plan-updated': 'FilePen',
      'comment-added': 'MessageSquare',
      'file-uploaded': 'Upload',
      'insight-added': 'Lightbulb',
      'relationship-created': 'Link',
      'status-changed': 'RefreshCw',
      'team-member-added': 'Users',
      'milestone-reached': 'Trophy'
    };

    return iconMap[type] || 'Activity';
  }

  /**
   * Get activity color based on category
   */
  getActivityColor(category: ActivityCategory): string {
    const colorMap: Record<ActivityCategory, string> = {
      'brand': 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
      'research': 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      'personas': 'text-green-600 bg-green-100 dark:bg-green-900/30',
      'strategy': 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
      'collaboration': 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
      'system': 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    };

    return colorMap[category] || 'text-gray-600 bg-gray-100';
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: ActivityCategory): string {
    const labelMap: Record<ActivityCategory, string> = {
      'brand': 'Brand Assets',
      'research': 'Research',
      'personas': 'Personas',
      'strategy': 'Strategy',
      'collaboration': 'Collaboration',
      'system': 'System'
    };

    return labelMap[category] || category;
  }

  // Private methods

  private getDateLabel(timestamp: number): string {
    const now = new Date();
    const date = new Date(timestamp);
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (activityDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (activityDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (now.getTime() - activityDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
      // Within last week
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      // Older
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  private loadActivities(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.activities = JSON.parse(stored);
        logger.info('Activities loaded', { count: this.activities.length });
      }
    } catch (error) {
      logger.error('Failed to load activities', error);
      this.activities = [];
    }
  }

  private saveActivities(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.activities));
    } catch (error) {
      logger.error('Failed to save activities', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.activities]);
    });
  }
}

// Export singleton instance
export const activityService = new ActivityService();
