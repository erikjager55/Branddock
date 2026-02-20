'use client';

import { useHelpCategories } from '@/hooks/use-help';
import { SkeletonCard } from '@/components/shared';
import { TopicCard } from './TopicCard';
import type { HelpCategoryItem } from '@/types/help';

// ─── Fallback static data ────────────────────────────────
const FALLBACK_CATEGORIES: HelpCategoryItem[] = [
  {
    id: 'cat-1',
    name: 'Getting Started',
    slug: 'getting-started',
    icon: 'Rocket',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    articleCount: 8,
  },
  {
    id: 'cat-2',
    name: 'Features',
    slug: 'features',
    icon: 'Layers',
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    articleCount: 8,
  },
  {
    id: 'cat-3',
    name: 'Knowledge Base',
    slug: 'knowledge-base',
    icon: 'BookOpen',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    articleCount: 12,
  },
  {
    id: 'cat-4',
    name: 'Account & Profile',
    slug: 'account-profile',
    icon: 'UserCircle',
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
    articleCount: 6,
  },
  {
    id: 'cat-5',
    name: 'Billing & Plans',
    slug: 'billing-plans',
    icon: 'CreditCard',
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    articleCount: 5,
  },
  {
    id: 'cat-6',
    name: 'Troubleshooting',
    slug: 'troubleshooting',
    icon: 'AlertTriangle',
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    articleCount: 8,
  },
];

export function BrowseByTopic() {
  const { data: categories, isLoading } = useHelpCategories();

  const items = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Browse by Topic</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} height={80} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((category) => (
            <TopicCard
              key={category.id}
              category={category}
              onClick={() => console.log('Browse topic:', category.slug)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
