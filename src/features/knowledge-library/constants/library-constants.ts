import type { ResourceType, DifficultyLevel } from "../types/knowledge-library.types";

export const RESOURCE_TYPE_ICONS: Record<ResourceType, { icon: string; label: string }> = {
  BOOK: { icon: "BookOpen", label: "Book" },
  ARTICLE: { icon: "FileText", label: "Article" },
  RESEARCH: { icon: "FileText", label: "Research" },
  GUIDE: { icon: "BookOpen", label: "Guide" },
  TEMPLATE: { icon: "FileText", label: "Template" },
  CASE_STUDY: { icon: "FileText", label: "Case Study" },
  WORKSHOP_RESOURCE: { icon: "Lightbulb", label: "Workshop" },
  MASTERCLASS: { icon: "Lightbulb", label: "Masterclass" },
  PODCAST: { icon: "Headphones", label: "Podcast" },
  WEBSITE: { icon: "Globe", label: "Website" },
  DESIGN: { icon: "Pencil", label: "Design" },
  VIDEO: { icon: "Play", label: "Video" },
};

export const RESOURCE_CATEGORIES = [
  "Brand Strategy",
  "Research",
  "Content",
  "Marketing",
  "Design",
  "Technology",
  "Psychology",
  "User Experience",
  "Trends",
] as const;

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, { dot: string; label: string }> = {
  BEGINNER: { dot: "bg-green-500", label: "Beginner" },
  INTERMEDIATE: { dot: "bg-yellow-500", label: "Intermediate" },
  ADVANCED: { dot: "bg-red-500", label: "Advanced" },
};

export const SUPPORTED_IMPORT_PLATFORMS =
  "YouTube, Vimeo, Medium, Substack, Amazon Books, Coursera, Udemy";

export const UPLOAD_FORMATS = ["PDF", "DOCX", "PPTX", "MP4", "JPG", "PNG", "MP3"];

export const UPLOAD_MAX_SIZE = 50 * 1024 * 1024; // 50MB
