import type { Metadata } from 'next';
import '../index.css';
import { QueryProvider } from '@/providers/query-provider';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { Toaster } from 'sonner';
import { validateEnv } from '@/lib/env-validation';

// Validate environment variables at app start (server component)
validateEnv();

export const metadata: Metadata = {
  title: 'Branddock',
  description: 'Brand strategy, research & AI content platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <PostHogProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </PostHogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
