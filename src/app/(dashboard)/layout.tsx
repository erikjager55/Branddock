"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageTransition } from "@/components/ui/PageTransition";
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

const sectionLabels: Record<string, Record<string, string>> = {
  knowledge: {
    "brand-foundation": "Brand Foundation",
    "business-strategy": "Business Strategy",
    brandstyle: "Brandstyle",
    personas: "Personas",
    products: "Products",
    "market-insights": "Market Insights",
    library: "Knowledge Library",
    "brand-alignment": "Brand Alignment",
  },
  strategy: {
    campaigns: "Campaigns",
    "content-calendar": "Content Calendar",
    goals: "Goals & KPIs",
    competitors: "Competitors",
  },
  validation: {
    "research-hub": "Research Hub",
    "research-bundles": "Research Bundles",
    "custom-validation": "Custom Validation",
    "ai-exploration": "AI Exploration",
    workshops: "Workshops",
    interviews: "Interviews",
    questionnaires: "Questionnaires",
  },
  settings: {
    general: "General",
    workspace: "Workspace",
    members: "Members",
    billing: "Billing",
    integrations: "Integrations",
    "api-keys": "API Keys",
  },
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

  const rootSections = sectionLabels[root];
  if (rootSections && segments[1]) {
    const sectionLabel = rootSections[segments[1]];
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

  const rootSections = sectionLabels[root];
  if (rootSections && segments[1]) {
    return rootSections[segments[1]] || pageTitles[`/${root}`] || "Branddock";
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
        id="main-content"
        className={cn(
          "pt-16 transition-all duration-300",
          "ml-0 md:ml-16",
          !sidebarCollapsed && "md:ml-64"
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <PageTransition key={pathname}>
              {children}
            </PageTransition>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
