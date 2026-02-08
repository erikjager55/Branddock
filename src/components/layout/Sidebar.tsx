"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  CheckCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Strategy", href: "/strategy", icon: Target },
  { name: "Validation", href: "/validation", icon: CheckCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-surface-dark border-r border-border-dark transition-all duration-300 z-50",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-dark">
        {sidebarOpen && (
          <span className="text-xl font-bold text-primary">Branddock</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-background-dark transition-colors"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 text-text-dark" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-dark" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-text-dark hover:bg-background-dark",
                !sidebarOpen && "justify-center"
              )}
              title={!sidebarOpen ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
