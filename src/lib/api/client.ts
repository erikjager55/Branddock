/**
 * Central API client with 423 (Locked) error handling.
 *
 * Usage:
 *   import { fetchApi, LockError } from '@/lib/api/client';
 *   const data = await fetchApi<MyType>('/api/products/123', { method: 'PATCH', ... });
 */
import { toast } from 'sonner';

export class LockError extends Error {
  constructor(message?: string) {
    super(message || 'Item is locked');
    this.name = 'LockError';
  }
}

export async function fetchApi<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);

  if (res.status === 423) {
    const data = await res.json().catch(() => ({}));
    toast.error('Item is locked', {
      description: data.error || 'Unlock the item to make changes.',
    });
    throw new LockError(data.error);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}
