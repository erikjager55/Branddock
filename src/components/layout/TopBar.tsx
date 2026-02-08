"use client";

import { useState } from "react";
import { Search, Bell, LogOut, Settings, User } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, type DropdownEntry } from "@/components/ui/Dropdown";
import { GlobalSearch } from "@/components/platform/GlobalSearch";
import { NotificationPanel } from "@/components/platform/NotificationPanel";

interface TopBarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function TopBar({ title, breadcrumbs }: TopBarProps) {
  const { sidebarCollapsed } = useUIStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userMenuItems: DropdownEntry[] = [
    {
      label: "Profile",
      icon: <User className="w-4 h-4" />,
      onClick: () => {},
    },
    {
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {},
    },
    "separator",
    {
      label: "Sign out",
      icon: <LogOut className="w-4 h-4" />,
      onClick: () => {},
      danger: true,
    },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 h-16 bg-surface-dark border-b border-border-dark transition-all duration-300 z-40",
          sidebarCollapsed ? "left-16" : "left-64"
        )}
      >
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left: Title + Breadcrumb */}
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumb items={breadcrumbs} className="mb-0.5" />
            )}
            <h1
              className={cn(
                "font-semibold text-text-dark",
                breadcrumbs ? "text-lg leading-tight" : "text-xl"
              )}
            >
              {title}
            </h1>
          </div>

          {/* Right: Search, Notifications, User */}
          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <button
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                  })
                )
              }
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-border-dark bg-background-dark text-sm text-text-dark/40 hover:text-text-dark/60 hover:border-border-dark/80 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden md:inline-flex text-[10px] font-mono border border-border-dark rounded px-1 py-0.5">
                ⌘K
              </kbd>
            </button>

            {/* Notification bell */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-md text-text-dark/50 hover:text-text-dark hover:bg-background-dark transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            </button>

            {/* User avatar + dropdown */}
            <Dropdown trigger={
              <button className="p-1 rounded-full hover:ring-2 hover:ring-border-dark transition-all">
                <Avatar name="Erik Jager" size="sm" />
              </button>
            } items={userMenuItems} align="right" />
          </div>
        </div>
      </header>

      <GlobalSearch />
      <NotificationPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
