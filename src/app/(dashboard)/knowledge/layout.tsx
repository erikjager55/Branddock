"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Target,
  Palette,
  Users,
  Package,
  TrendingUp,
  BookOpen,
  Shield,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const secondaryNavItems = [
  {
    label: "Brand Foundation",
    href: "/knowledge/brand-foundation",
    icon: Layers,
  },
  {
    label: "Business Strategy",
    href: "/knowledge/business-strategy",
    icon: Target,
  },
  {
    label: "Brandstyle",
    href: "/knowledge/brandstyle",
    icon: Palette,
  },
  {
    label: "Personas",
    href: "/knowledge/personas",
    icon: Users,
  },
  {
    label: "Products",
    href: "/knowledge/products",
    icon: Package,
  },
  {
    label: "Market Insights",
    href: "/knowledge/market-insights",
    icon: TrendingUp,
  },
  {
    label: "Knowledge Library",
    href: "/knowledge/library",
    icon: BookOpen,
  },
  {
    label: "Brand Alignment",
    href: "/knowledge/brand-alignment",
    icon: Shield,
  },
];

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeItem = secondaryNavItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/knowledge" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex gap-6">
      {/* Secondary Sidebar */}
      <aside className="w-56 flex-shrink-0">
        {/* Mobile toggle */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-text-dark bg-surface-dark border border-border-dark md:hidden mb-2"
        >
          <span>{activeItem?.label || "Knowledge"}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isMobileOpen && "rotate-180"
            )}
          />
        </button>

        <nav
          className={cn(
            "sticky top-20 space-y-1",
            "md:block",
            isMobileOpen ? "block" : "hidden md:block"
          )}
        >
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/knowledge" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-dark/60 hover:text-text-dark hover:bg-surface-dark"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
