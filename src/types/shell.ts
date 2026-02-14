import { type LucideIcon } from "lucide-react";

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

export interface SidebarSection {
  label?: string; // undefined = no header (top section)
  items: SidebarItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
