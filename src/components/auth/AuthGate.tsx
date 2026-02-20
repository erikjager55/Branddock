'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSession, authClient } from '@/lib/auth-client';
import { AuthPage } from './AuthPage';
import { Loader2 } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const orgSetRef = useRef(false);

  // Auto-set active organization after login
  useEffect(() => {
    if (!session || orgSetRef.current) return;

    const activeOrgId = (session.session as Record<string, unknown>).activeOrganizationId as string | undefined;
    if (activeOrgId) {
      orgSetRef.current = true;
      return;
    }

    orgSetRef.current = true;
    authClient.organization.list().then((result) => {
      const orgs = result.data;
      if (orgs && orgs.length > 0) {
        authClient.organization.setActive({ organizationId: orgs[0].id });
      }
    });
  }, [session]);

  if (isPending) {
    return (
      <div data-testid="auth-loading" className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/Logo_Branddock_RGB.png"
            alt="Branddock"
            width={180}
            height={32}
            priority
          />
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
