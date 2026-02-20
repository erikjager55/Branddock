/**
 * Static help category configuration — maps category slugs to UI metadata.
 * Used as fallback when API data is loading.
 */

export interface HelpCategoryConfig {
  slug: string;
  name: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  description: string;
}

export const HELP_CATEGORIES: HelpCategoryConfig[] = [
  {
    slug: "getting-started",
    name: "Getting Started",
    icon: "Rocket",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    description: "Learn the basics of setting up and using Branddock",
  },
  {
    slug: "features-tools",
    name: "Features & Tools",
    icon: "Wrench",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    description: "Detailed guides for all platform features",
  },
  {
    slug: "knowledge-research",
    name: "Knowledge & Research",
    icon: "BookOpen",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    description: "Research methods, validation, and knowledge management",
  },
  {
    slug: "account-team",
    name: "Account & Team",
    icon: "Users",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    description: "Account settings, team management, and permissions",
  },
  {
    slug: "billing-plans",
    name: "Billing & Plans",
    icon: "CreditCard",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    description: "Subscription plans, invoices, and payment methods",
  },
  {
    slug: "troubleshooting",
    name: "Troubleshooting",
    icon: "LifeBuoy",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    description: "Common issues and how to resolve them",
  },
];

export function getCategoryConfig(slug: string): HelpCategoryConfig | undefined {
  return HELP_CATEGORIES.find((c) => c.slug === slug);
}
