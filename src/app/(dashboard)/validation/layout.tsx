"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  Package,
  ClipboardCheck,
  Sparkles,
  Users,
  MessageCircle,
  FileQuestion,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const secondaryNavItems = [
  {
    label: "Research Hub",
    href: "/validation/research-hub",
    icon: FlaskConical,
  },
  {
    label: "Research Bundles",
    href: "/validation/research-bundles",
    icon: Package,
  },
  {
    label: "Custom Validation",
    href: "/validation/custom-validation",
    icon: ClipboardCheck,
  },
  {
    label: "AI Exploration",
    href: "/validation/ai-exploration",
    icon: Sparkles,
  },
  {
    label: "Workshops",
    href: "/validation/workshops",
    icon: Users,
  },
  {
    label: "Interviews",
    href: "/validation/interviews",
    icon: MessageCircle,
  },
  {
    label: "Questionnaires",
    href: "/validation/questionnaires",
    icon: FileQuestion,
  },
];

export default function ValidationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeItem = secondaryNavItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/validation" && pathname.startsWith(item.href))
  );

  return (
    <div className="flex gap-8">
      {/* Secondary Sidebar */}
      <aside className="w-52 flex-shrink-0">
        {/* Mobile toggle */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-text-dark bg-surface-dark border border-border-dark md:hidden mb-2"
        >
          <span>{activeItem?.label || "Validation"}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isMobileOpen && "rotate-180"
            )}
          />
        </button>

        <nav
          className={cn(
            "sticky top-20 space-y-0.5",
            "md:block",
            isMobileOpen ? "block" : "hidden md:block"
          )}
        >
          <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-text-dark/40">
            Validation
          </p>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/validation" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 h-9 px-3 text-sm font-medium transition-colors border-l-2",
                  isActive
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-text-dark/60 hover:text-text-dark hover:bg-surface-dark border-transparent"
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
