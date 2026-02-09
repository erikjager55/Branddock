"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Users, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const secondaryNavItems = [
  {
    label: "Brand Foundation",
    href: "/knowledge/brand-foundation",
    icon: Layers,
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
];

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      {/* Secondary Sidebar */}
      <aside className="w-56 flex-shrink-0">
        <nav className="sticky top-20 space-y-1">
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
