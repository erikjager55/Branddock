"use client";

import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";

interface TopBarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function TopBar({ title, breadcrumbs }: TopBarProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 bg-surface-dark border-b border-border-dark transition-all duration-300 z-40",
        sidebarCollapsed ? "left-16" : "left-64"
      )}
    >
      <div className="h-full px-6 flex items-center gap-4">
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
      </div>
    </header>
  );
}
