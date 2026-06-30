import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '../index.css';
import { QueryProvider } from '@/providers/query-provider';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { I18nProvider } from '@/lib/ui-i18n/I18nProvider';
import { UI_LOCALE_COOKIE, resolveUiLocale } from '@/lib/ui-i18n/config';
import { Toaster } from 'sonner';
import { validateEnv } from '@/lib/env-validation';

// Validate environment variables at app start (server component)
validateEnv();

export const metadata: Metadata = {
  title: 'Branddock',
  description: 'Brand strategy, research & AI content platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the per-user UI locale server-side from the cookie so SSR and the
  // client agree on <html lang> and the first paint — no hydration flash.
  const cookieStore = await cookies();
  const uiLocale = resolveUiLocale(cookieStore.get(UI_LOCALE_COOKIE)?.value);

  return (
    <html lang={uiLocale}>
      <body>
        <QueryProvider>
          <PostHogProvider>
            <I18nProvider initialLocale={uiLocale}>{children}</I18nProvider>
            <Toaster position="bottom-right" richColors />
          </PostHogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
