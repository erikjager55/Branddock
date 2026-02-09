"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useUIStore } from "@/stores/ui-store";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type BreadcrumbItem } from "@/components/ui/Breadcrumb";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/knowledge": "Knowledge",
  "/strategy": "Strategy",
  "/validation": "Validation",
  "/settings": "Settings",
};

const sectionLabels: Record<string, string> = {
  "brand-foundation": "Brand Foundation",
  "business-strategy": "Business Strategy",
  brandstyle: "Brandstyle",
  personas: "Personas",
  products: "Products",
  "market-insights": "Market Insights",
  library: "Knowledge Library",
  "brand-alignment": "Brand Alignment",
};

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] | undefined {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return undefined;

  const crumbs: BreadcrumbItem[] = [];
  const root = segments[0];
  const rootTitle = pageTitles[`/${root}`];
  if (rootTitle) {
    crumbs.push({ label: rootTitle, href: `/${root}` });
  }

  if (root === "knowledge" && segments[1]) {
    const sectionLabel = sectionLabels[segments[1]];
    if (sectionLabel) {
      crumbs.push({
        label: sectionLabel,
        href: `/${root}/${segments[1]}`,
      });
    }
  }

  return crumbs.length > 0 ? crumbs : undefined;
}

function getTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0];

  if (root === "knowledge" && segments[1]) {
    return sectionLabels[segments[1]] || "Knowledge";
  }

  return pageTitles[`/${root}`] || pageTitles[pathname] || "Branddock";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const title = getTitle(pathname || "/dashboard");
  const breadcrumbs = buildBreadcrumbs(pathname || "/dashboard");

  return (
    <div className="min-h-screen bg-background-dark">
      <Sidebar />
      <TopBar title={title} breadcrumbs={breadcrumbs} />
      <main
        className={cn(
          "pt-16 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
