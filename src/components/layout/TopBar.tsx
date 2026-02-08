"use client";

import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 bg-surface-dark border-b border-border-dark transition-all duration-300 z-40",
        sidebarOpen ? "left-64" : "left-16"
      )}
    >
      <div className="h-full px-6 flex items-center">
        <h1 className="text-xl font-semibold text-text-dark">{title}</h1>
      </div>
    </header>
  );
}
