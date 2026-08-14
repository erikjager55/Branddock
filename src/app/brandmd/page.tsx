import type { Metadata } from 'next';
import { GeneratorClient } from './generator-client';

// Publieke generator-pagina (touchpoint 0.1/1.x) — App Router, buiten de
// SPA-shell/AuthGate, net als /p/[slug]. EN-first (launch-plan §6).

export const metadata: Metadata = {
  title: 'brand.md generator — give every AI agent your brand memory | Branddock',
  description:
    'Paste your URL and get your brand.md: the open file format that keeps ChatGPT, Claude, Cursor and every AI tool on-brand. Free, no account.',
  openGraph: {
    title: 'Turn any website into a brand.md',
    description:
      'Free generator for the open brand-identity standard. Strategy, voice, colors, typography, audience — in one file every AI tool can read.',
  },
};

export default function BrandMdGeneratorPage() {
  return <GeneratorClient />;
}
