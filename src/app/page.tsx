'use client';

import dynamic from 'next/dynamic';
import { AuthGate } from '@/components/auth/AuthGate';

const App = dynamic(() => import('../App'), { ssr: false });

export default function Page() {
  return (
    <AuthGate>
      <App />
    </AuthGate>
  );
}
