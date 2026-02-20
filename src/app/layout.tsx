import type { Metadata } from 'next';
import '../index.css';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from 'sonner';

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
          {children}
          <Toaster position="bottom-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
