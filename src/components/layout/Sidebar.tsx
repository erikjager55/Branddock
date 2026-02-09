"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  CheckCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
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

function SidebarContent({
  expanded,
  onToggle,
  onNavigate,
}: {
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-dark">
        {expanded && (
          <span className="text-xl font-bold text-primary">Branddock</span>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-background-dark transition-colors"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
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
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-text-dark hover:bg-background-dark",
                !expanded && "justify-center"
              )}
              title={!expanded ? item.name : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {expanded && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, collapseSidebar, sidebarOpen, setSidebarOpen } =
    useUIStore();
  const expanded = !sidebarCollapsed;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-0 h-screen bg-surface-dark border-r border-border-dark transition-all duration-300 z-50",
          expanded ? "w-64" : "w-16"
        )}
      >
        <SidebarContent
          expanded={expanded}
          onToggle={() => collapseSidebar(!sidebarCollapsed)}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="md:hidden fixed left-0 top-0 h-screen w-64 bg-surface-dark border-r border-border-dark z-50"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-md text-text-dark/50 hover:text-text-dark hover:bg-background-dark transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent
                expanded
                onToggle={() => setSidebarOpen(false)}
                onNavigate={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
