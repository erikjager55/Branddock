// =============================================================
// Product feature constants
// =============================================================

export const CATEGORY_ICONS: Record<string, string> = {
  software: "Globe",
  consulting: "Zap",
  mobile: "Smartphone",
  hardware: "Cpu",
  service: "Wrench",
  default: "Package",
};

export const ANALYZE_STEPS = [
  "Connecting to website",
  "Scanning product information",
  "Extracting features & specifications",
  "Analyzing pricing model",
  "Identifying use cases",
  "Detecting target audience",
  "Generating product profile",
];

export const ANALYZER_TABS = [
  { id: "url" as const, icon: "Globe", label: "Website URL" },
  { id: "pdf" as const, icon: "FileText", label: "PDF Upload" },
  { id: "manual" as const, icon: "Pencil", label: "Manual Entry" },
];

export const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  MANUAL: { label: "Manual Entry", color: "text-gray-600" },
  WEBSITE_URL: { label: "Website URL", color: "text-blue-600" },
  PDF_UPLOAD: { label: "PDF Upload", color: "text-purple-600" },
};

export const STATUS_BADGES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  ANALYZED: { bg: "bg-green-100", text: "text-green-700", label: "Analyzed" },
  DRAFT: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  ARCHIVED: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Archived",
  },
};
