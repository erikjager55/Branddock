import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import '../index.css';
import { QueryProvider } from '@/providers/query-provider';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { I18nProvider } from '@/lib/ui-i18n/I18nProvider';
import { UI_LOCALE_COOKIE } from '@/lib/ui-i18n/config';
import { PATHNAME_HEADER, SEARCH_HEADER } from '@/lib/ui-i18n/document-locale.shared';
import { resolveDocumentLocale } from '@/lib/ui-i18n/document-locale';
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
  // De UI-taal komt uit de cookie, zodat SSR en client het eens zijn over de
  // eerste paint (geen hydration-flash). `<html lang>` volgt een ANDERE bron:
  // op de publieke routes beschrijft het de taal van de pagina zelf, niet de
  // voorkeur van de bezoeker. Zie `document-locale.ts` voor het waarom.
  //
  // Beide reads zijn Dynamic APIs en houden de app dus op server-rendering.
  // Dat is een bewuste keuze, geen omissie: de enforce-CSP is nonce-based per
  // request, en een gecachete respons draagt een verouderde nonce waardoor
  // `'strict-dynamic'` élk script blokkeert (gemeten: 6/10 CSP-tests falen).
  // Onderbouwing en de weg terug staan in tasks/static-rendering-regressie.md.
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const effectivePath = headerList.get(PATHNAME_HEADER);
  if (!effectivePath && process.env.NODE_ENV !== 'production') {
    // Zonder deze header valt `<html lang>` stil terug op de UI-taal. Buiten
    // productie meteen melden, zodat een versmalde proxy-matcher zich bij de
    // eerste `npm run dev` verraadt in plaats van pas op de publieke site.
    console.warn(
      `[layout] request zonder ${PATHNAME_HEADER} — <html lang> valt terug op de UI-taal. ` +
        'Draait de proxy voor deze route? Zie src/lib/ui-i18n/document-locale.ts.',
    );
  }
  const { lang, uiLocale } = await resolveDocumentLocale(
    effectivePath ?? '',
    cookieStore.get(UI_LOCALE_COOKIE)?.value,
    headerList.get(SEARCH_HEADER),
  );

  return (
    <html lang={lang}>
      <body>
        <QueryProvider>
          <PostHogProvider>
            <I18nProvider initialLocale={uiLocale}>
              {children}
            </I18nProvider>
            <Toaster position="bottom-right" richColors />
          </PostHogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
