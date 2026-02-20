// =============================================================
// Content Type Registry — 23 types in 5 categories
// =============================================================

import type { LucideIcon } from 'lucide-react';
import {
  FileText, BookOpen, Newspaper, Presentation, ScrollText,
  Linkedin, Instagram, Twitter, Facebook, MessageSquare,
  Image, PenTool, BarChart3, Palette, Layout,
  Video, Film, Clapperboard, MonitorPlay,
  Mail, Send, Bell, Megaphone,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────

export type ContentCategory = 'written' | 'social' | 'visual' | 'video' | 'email';

export interface ContentTypeDefinition {
  id: string;
  name: string;
  description: string;
  category: ContentCategory;
  outputFormats: string[];
  icon: LucideIcon;
}

// ─── Registry ──────────────────────────────────────────────

export const CONTENT_TYPES: ContentTypeDefinition[] = [
  // Written (5)
  { id: 'blog-post', name: 'Blog Post', description: 'Long-form blog article', category: 'written', outputFormats: ['text', 'html'], icon: FileText },
  { id: 'whitepaper', name: 'Whitepaper', description: 'In-depth research document', category: 'written', outputFormats: ['text', 'pdf'], icon: BookOpen },
  { id: 'press-release', name: 'Press Release', description: 'Official media announcement', category: 'written', outputFormats: ['text'], icon: Newspaper },
  { id: 'case-study', name: 'Case Study', description: 'Client success story', category: 'written', outputFormats: ['text', 'pdf'], icon: Presentation },
  { id: 'landing-page', name: 'Landing Page', description: 'Conversion-focused web copy', category: 'written', outputFormats: ['text', 'html'], icon: ScrollText },

  // Social (5)
  { id: 'linkedin', name: 'LinkedIn Post', description: 'Professional network post', category: 'social', outputFormats: ['text', 'image'], icon: Linkedin },
  { id: 'instagram', name: 'Instagram Post', description: 'Visual social post', category: 'social', outputFormats: ['image', 'carousel'], icon: Instagram },
  { id: 'twitter', name: 'Twitter/X Thread', description: 'Short-form thread', category: 'social', outputFormats: ['text'], icon: Twitter },
  { id: 'facebook', name: 'Facebook Post', description: 'Social media post', category: 'social', outputFormats: ['text', 'image'], icon: Facebook },
  { id: 'social-ad', name: 'Social Ad', description: 'Paid social advertisement', category: 'social', outputFormats: ['text', 'image', 'video'], icon: MessageSquare },

  // Visual (5)
  { id: 'infographic', name: 'Infographic', description: 'Data visualization graphic', category: 'visual', outputFormats: ['image'], icon: BarChart3 },
  { id: 'social-graphic', name: 'Social Graphic', description: 'Branded social image', category: 'visual', outputFormats: ['image'], icon: Image },
  { id: 'illustration', name: 'Illustration', description: 'Custom brand illustration', category: 'visual', outputFormats: ['image'], icon: PenTool },
  { id: 'banner', name: 'Banner Ad', description: 'Display advertising banner', category: 'visual', outputFormats: ['image'], icon: Layout },
  { id: 'brand-asset', name: 'Brand Asset', description: 'Branded visual element', category: 'visual', outputFormats: ['image'], icon: Palette },

  // Video (4)
  { id: 'short-video', name: 'Short Video', description: 'Short-form video (15-60s)', category: 'video', outputFormats: ['video'], icon: Film },
  { id: 'explainer', name: 'Explainer Video', description: 'Product/service explainer', category: 'video', outputFormats: ['video'], icon: MonitorPlay },
  { id: 'testimonial-video', name: 'Testimonial', description: 'Customer testimonial video', category: 'video', outputFormats: ['video'], icon: Video },
  { id: 'promo-video', name: 'Promo Video', description: 'Promotional campaign video', category: 'video', outputFormats: ['video'], icon: Clapperboard },

  // Email (4)
  { id: 'newsletter', name: 'Newsletter', description: 'Email newsletter', category: 'email', outputFormats: ['text', 'html'], icon: Mail },
  { id: 'drip-campaign', name: 'Drip Campaign', description: 'Automated email sequence', category: 'email', outputFormats: ['text', 'html'], icon: Send },
  { id: 'announcement', name: 'Announcement', description: 'Product/feature announcement', category: 'email', outputFormats: ['text', 'html'], icon: Bell },
  { id: 'welcome-email', name: 'Welcome Email', description: 'Onboarding welcome series', category: 'email', outputFormats: ['text', 'html'], icon: Megaphone },
];

// ─── Helpers ───────────────────────────────────────────────

export const CONTENT_CATEGORIES: { id: ContentCategory; label: string }[] = [
  { id: 'written', label: 'Written' },
  { id: 'social', label: 'Social' },
  { id: 'visual', label: 'Visual' },
  { id: 'video', label: 'Video' },
  { id: 'email', label: 'Email' },
];

export function getContentTypesByCategory(category: ContentCategory): ContentTypeDefinition[] {
  return CONTENT_TYPES.filter((t) => t.category === category);
}

export function getContentTypeById(id: string): ContentTypeDefinition | undefined {
  return CONTENT_TYPES.find((t) => t.id === id);
}

export function getCategoryLabel(category: ContentCategory): string {
  return CONTENT_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
