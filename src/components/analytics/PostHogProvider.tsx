'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import { ensurePostHog, identifyUser, resetUser } from '@/lib/analytics/posthog-browser';

/**
 * Initializes the PostHog browser client on mount and wires identify/reset
 * to the auth state. Reads session via Better Auth's `useSession()` so it
 * works without prop-drilling.
 *
 * Place high in the tree (root layout body, inside QueryProvider). Logged-out
 * users still get auto-pageview + auto-capture; identify happens once session
 * resolves.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    void ensurePostHog();
  }, []);

  useEffect(() => {
    const user = session?.user;
    const sessionData = session?.session as Record<string, unknown> | undefined;
    const organizationId = (sessionData?.activeOrganizationId as string | undefined) ?? undefined;

    if (user?.id) {
      if (lastUserIdRef.current !== user.id) {
        void identifyUser({
          userId: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          organizationId,
        });
        lastUserIdRef.current = user.id;
      }
    } else if (lastUserIdRef.current) {
      void resetUser();
      lastUserIdRef.current = null;
    }
  }, [session]);

  return <>{children}</>;
}
