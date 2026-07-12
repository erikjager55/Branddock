import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://www.branddock.com';
  const now = new Date();
  return [
    { url: `${base}/marketing`, lastModified: now, priority: 1.0 },
    { url: `${base}/marketing/pricing`, lastModified: now, priority: 0.9 },
    { url: `${base}/marketing/about`, lastModified: now, priority: 0.6 },
    { url: `${base}/marketing/contact`, lastModified: now, priority: 0.5 },
    { url: `${base}/marketing/features/brand-voice`, lastModified: now, priority: 0.8 },
    { url: `${base}/marketing/features/content-canvas`, lastModified: now, priority: 0.8 },
    { url: `${base}/marketing/features/brand-alignment`, lastModified: now, priority: 0.8 },
    { url: `${base}/marketing/features/agents`, lastModified: now, priority: 0.7 },
  ];
}
