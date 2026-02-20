import type { SearchResponse, SearchParams } from '@/types/search';

export async function globalSearch(params: SearchParams): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('query', params.query);
  if (params.type && params.type !== 'all') searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`/api/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}

export async function fetchQuickActions(): Promise<{ id: string; icon: string; label: string; description: string; href: string; color: string }[]> {
  const res = await fetch('/api/search/quick-actions');
  if (!res.ok) throw new Error('Failed to fetch quick actions');
  return res.json();
}
