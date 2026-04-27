import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

/**
 * Sprint B · Step 3.D — per-user UI preferences hook.
 *
 * Reads the preferences JSON blob from `UserProfile.preferences`. Keys are
 * small UI flags that don't deserve dedicated columns. First known key:
 *   - brandAssistantTipDismissed: boolean
 *
 * The patch mutation merges shallowly on the server, so callers only send
 * the keys they want to change. Setting a key to `null` deletes it.
 */

export type UserPreferences = Record<string, unknown>;

const QUERY_KEY = ['user-preferences'] as const;

async function fetchPreferences(): Promise<UserPreferences> {
  const res = await fetch('/api/user/preferences');
  if (!res.ok) {
    // Unauthenticated → return empty so consumers render the default state
    // rather than erroring. Any genuine backend failure falls through here
    // too; we treat it the same since these are non-critical UI flags.
    return {};
  }
  const data = (await res.json()) as { preferences?: UserPreferences };
  return data.preferences ?? {};
}

async function patchPreferences(patch: UserPreferences): Promise<UserPreferences> {
  const res = await fetch('/api/user/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to update preferences');
  }
  const data = (await res.json()) as { preferences?: UserPreferences };
  return data.preferences ?? {};
}

export function useUserPreferences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPreferences,
    // UI preferences rarely change — cache generously to avoid flashes.
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserPreferences(): UseMutationResult<
  UserPreferences,
  Error,
  UserPreferences
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchPreferences,
    // Optimistic update so flag-toggles (e.g. "dismissed: true") feel
    // instant — no re-flash of the previous state while the PATCH is
    // in-flight.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const previous = qc.getQueryData<UserPreferences>(QUERY_KEY) ?? {};
      const next: UserPreferences = { ...previous };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
      qc.setQueryData(QUERY_KEY, next);
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        qc.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
