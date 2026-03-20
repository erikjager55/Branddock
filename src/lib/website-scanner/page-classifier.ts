// =============================================================
// Page Classifier — Classify URLs by page type based on path keywords
// =============================================================

export type PageType =
  | 'homepage'
  | 'about'
  | 'products'
  | 'team'
  | 'pricing'
  | 'contact'
  | 'blog'
  | 'cases'
  | 'careers'
  | 'faq'
  | 'other';

const PAGE_TYPE_KEYWORDS: Record<PageType, string[]> = {
  homepage: [],
  about: ['about', 'company', 'who-we-are', 'over-ons', 'about-us', 'our-story', 'mission', 'vision'],
  products: ['products', 'services', 'solutions', 'what-we-do', 'offerings', 'features', 'platform'],
  team: ['team', 'people', 'leadership', 'our-team', 'management', 'founders'],
  pricing: ['pricing', 'plans', 'packages', 'price', 'subscription'],
  contact: ['contact', 'get-in-touch', 'reach-us', 'contact-us'],
  blog: ['blog', 'news', 'articles', 'insights', 'resources', 'magazine'],
  cases: ['cases', 'clients', 'testimonials', 'portfolio', 'case-studies', 'customers', 'success-stories'],
  careers: ['careers', 'jobs', 'vacancies', 'work-with-us', 'join-us', 'hiring'],
  faq: ['faq', 'help', 'support', 'frequently-asked', 'knowledge-base'],
  other: [],
};

// Priority order for crawling (most valuable pages first)
const PRIORITY_ORDER: PageType[] = [
  'about',
  'products',
  'cases',
  'team',
  'pricing',
  'faq',
  'blog',
  'contact',
  'careers',
  'other',
];

/**
 * Classify a URL into a page type based on path keywords
 */
export function classifyUrl(url: string): PageType {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    // Root path = homepage
    if (pathname === '/' || pathname === '') return 'homepage';

    for (const [type, keywords] of Object.entries(PAGE_TYPE_KEYWORDS)) {
      if (type === 'homepage' || type === 'other') continue;
      if (keywords.some(kw => pathname.includes(kw))) {
        return type as PageType;
      }
    }
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Classify and prioritize a list of URLs.
 * Returns URLs sorted by priority, with max `limit` results.
 */
export function classifyAndPrioritize(
  urls: string[],
  limit: number = 15,
): Array<{ url: string; pageType: PageType }> {
  const classified = urls.map(url => ({
    url,
    pageType: classifyUrl(url),
  }));

  // Sort by priority
  classified.sort((a, b) => {
    const aIdx = PRIORITY_ORDER.indexOf(a.pageType);
    const bIdx = PRIORITY_ORDER.indexOf(b.pageType);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // Deduplicate by page type (keep max 3 per type, except 'other' which gets 1)
  const typeCounts = new Map<PageType, number>();
  const result: Array<{ url: string; pageType: PageType }> = [];

  for (const item of classified) {
    const count = typeCounts.get(item.pageType) ?? 0;
    const maxPerType = item.pageType === 'other' ? 1 : 3;
    if (count >= maxPerType) continue;
    typeCounts.set(item.pageType, count + 1);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}
