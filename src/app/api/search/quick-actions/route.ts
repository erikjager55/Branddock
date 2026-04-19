import { NextResponse } from 'next/server';
import { withCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';
import { getServerSession } from '@/lib/auth-server';

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

const cachedGET = withCache(cacheKeys.static.quickActions, CACHE_TTL.STATIC)(_GET);

// Auth required — response is static, so the cache wraps the inner
// handler; auth check runs on every request before cache lookup.
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return cachedGET();
}
