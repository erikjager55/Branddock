import { NextResponse } from 'next/server';
import { withCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';

const _GET = async () => {
  return NextResponse.json([
    {
      id: 'research',
      icon: 'Sparkles',
      label: 'Start New Research',
      description: 'Create a research plan',
      href: 'research',
      color: 'text-green-600',
    },
    {
      id: 'persona',
      icon: 'UserPlus',
      label: 'Create Persona',
      description: 'Add a new persona',
      href: 'persona-create',
      color: 'text-blue-600',
    },
    {
      id: 'relationships',
      icon: 'Link',
      label: 'View Relationships',
      description: 'See data connections',
      href: 'relationships',
      color: 'text-purple-600',
    },
  ]);
};

export const GET = withCache(cacheKeys.static.quickActions, CACHE_TTL.STATIC)(_GET);
