"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";

export interface CrossLinkCardProps {
  /** Lucide icon component for the leading visual */
  icon: LucideIcon;
  /** Short title — what the link points to */
  title: string;
  /** One-sentence description of why the user might want to follow it */
  description: string;
  /** CTA label on the right */
  ctaLabel: string;
  /** Click handler — typically a section navigator like setActiveSection */
  onClick: () => void;
  /** Color accent. Defaults to teal (matches Brand Voice). Use 'violet' for Brandstyle. */
  accent?: "teal" | "violet";
}

const ACCENT_STYLES = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    icon: "text-teal-600",
    title: "text-teal-900",
    body: "text-teal-700",
    cta: "text-teal-700 hover:text-teal-900",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: "text-violet-600",
    title: "text-violet-900",
    body: "text-violet-700",
    cta: "text-violet-700 hover:text-violet-900",
  },
} as const;

export function CrossLinkCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onClick,
  accent = "teal",
}: CrossLinkCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${styles.border} ${styles.bg} px-4 py-3`}
    >
      <Icon className={`w-5 h-5 ${styles.icon} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold ${styles.title}`}>{title}</h4>
        <p className={`text-xs ${styles.body} mt-0.5`}>{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 text-xs font-medium ${styles.cta} flex-shrink-0 transition-colors`}
      >
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
