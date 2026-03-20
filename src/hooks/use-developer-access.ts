'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchDeveloperAccess(): Promise<boolean> {
  const res = await fetch('/api/auth/developer-check');
  if (!res.ok) return false;
  const data = await res.json();
  return data.isDeveloper === true;
}

export function useDeveloperAccess() {
  return useQuery({
    queryKey: ['developer-access'],
    queryFn: fetchDeveloperAccess,
    staleTime: 5 * 60 * 1000,
  });
}
