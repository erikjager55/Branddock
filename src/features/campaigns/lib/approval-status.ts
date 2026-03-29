/** Approval status hex colors (inline style, Tailwind 4 purge safe) */
export const APPROVAL_HEX: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: "Draft", bg: "#f9fafb", text: "#4b5563", border: "#e5e7eb" },
  IN_REVIEW: { label: "In Review", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  CHANGES_REQUESTED: { label: "Changes", bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  APPROVED: { label: "Approved", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  PUBLISHED: { label: "Published", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
};
