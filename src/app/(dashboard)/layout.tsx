"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useUIStore } from "@/stores/ui-store";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/knowledge": "Knowledge",
  "/strategy": "Strategy",
  "/validation": "Validation",
  "/settings": "Settings",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUIStore();
  const pathname = usePathname();
  const title = pageTitles[pathname || "/dashboard"] || "Branddock";

  return (
    <div className="min-h-screen bg-background-dark">
      <Sidebar />
      <TopBar title={title} />
      <main
        className={cn(
          "pt-16 transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
