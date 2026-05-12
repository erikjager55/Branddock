import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://www.branddock.com';
  return {
    rules: {
      userAgent: '*',
      allow: '/marketing',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${base}/marketing/sitemap.xml`,
  };
}
