import React from 'react';
import { Search, Bell, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { ShortcutHint, getModifierKey } from './ShortcutHint';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { BreadcrumbItem } from '../types/workflow';
import { useNotificationCount } from '../hooks/use-notifications';
import { useShellStore } from '../stores/useShellStore';
import { HelpIndicator } from './HelpTooltip';
import { OrganizationSwitcher } from './auth/OrganizationSwitcher';

interface TopNavigationBarProps {
  breadcrumbs?: BreadcrumbItem[];
  onNavigate: (route: string) => void;
  onQuickContent?: () => void;
}

export function TopNavigationBar({
  breadcrumbs = [],
  onNavigate,
  onQuickContent,
}: TopNavigationBarProps) {
  const { data: countData } = useNotificationCount();
  const unreadCount = countData?.count ?? 0;
  const { openSearch, openNotifications } = useShellStore();

  return (
    <div data-testid="top-nav" className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="flex h-14 items-center gap-4 px-6">
        {/* Left: Organization + Breadcrumbs */}
        <OrganizationSwitcher />
        <div className="w-px h-6 bg-gray-200" />
        <div className="flex-1 min-w-0">
          {breadcrumbs.length > 0 && (
            <BreadcrumbNavigation
              items={breadcrumbs}
              onNavigate={onNavigate}
              showHome={true}
            />
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Content */}
          {onQuickContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={onQuickContent}
              className="gap-1.5 hidden sm:flex"
            >
              <Zap className="h-3.5 w-3.5 text-purple-500" />
              <span className="hidden md:inline">Quick Content</span>
            </Button>
          )}

          {/* Global Search */}
          <Button
            data-testid="topnav-search-button"
            variant="outline"
            size="sm"
            onClick={() => openSearch()}
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

          {/* Notifications */}
          <Button
            data-testid="topnav-notifications-button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 relative"
            title={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            onClick={() => openNotifications()}
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
            onClick={() => openSearch()}
            className="sm:hidden h-9 w-9 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
