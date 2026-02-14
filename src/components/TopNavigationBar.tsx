import React, { useState, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { ShortcutHint, getModifierKey } from './ShortcutHint';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { BreadcrumbItem } from '../types/workflow';
import { activityService } from '../services/ActivityService';
import { HelpIndicator } from './HelpTooltip';

interface TopNavigationBarProps {
  breadcrumbs?: BreadcrumbItem[];
  onNavigate: (route: string) => void;
  onSearchClick: () => void;
  onActivityClick: () => void;
}

export function TopNavigationBar({
  breadcrumbs = [],
  onNavigate,
  onSearchClick,
  onActivityClick,
}: TopNavigationBarProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial load
    setUnreadCount(activityService.getUnreadCount());

    // Subscribe to changes
    const unsubscribe = activityService.subscribe(() => {
      setUnreadCount(activityService.getUnreadCount());
    });

    return unsubscribe;
  }, []);

  return (
    <div className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="flex h-14 items-center gap-4 px-6">
        {/* Left: Breadcrumbs */}
        <div className="flex-1 min-w-0">
          {breadcrumbs.length > 0 ? (
            <BreadcrumbNavigation
              items={breadcrumbs}
              onNavigate={onNavigate}
              showHome={true}
            />
          ) : (
            <div className="text-sm text-gray-500 font-medium">
              Research Tool
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Global Search */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSearchClick}
            className="gap-2 hidden sm:flex"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search</span>
            <ShortcutHint keys={[getModifierKey(), 'K']} />
          </Button>

          {/* Help Tooltips */}
          <div className="hidden lg:block">
            <HelpIndicator />
          </div>

          {/* Activity Feed */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 relative"
            title={`Activity Feed ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            onClick={onActivityClick}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <>
                {/* Red dot indicator */}
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                {/* Unread count badge */}
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-medium rounded-full bg-primary text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </>
            )}
          </Button>

          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchClick}
            className="sm:hidden h-9 w-9 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}