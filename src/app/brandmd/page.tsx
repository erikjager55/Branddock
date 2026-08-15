import type { Metadata } from 'next';
import { GeneratorClient } from './generator-client';

// Publieke generator-pagina (touchpoint 0.1/1.x) — App Router, buiten de
// SPA-shell/AuthGate, net als /p/[slug].
// Nederlands sinds 2026-08-15 (user-besluit). Dit draait de EN-first-keuze
// uit launch-plan §6 terug voor de publieke brand.md-pagina's; de spec-docs
// en upstream-PR's blijven Engels — die richten zich op de standaard, niet
// op de funnel.

export const metadata: Metadata = {
  title: 'brand.md-generator — geef elke AI-agent het geheugen van je merk | Branddock',
  description:
    'Plak je URL en krijg je brand.md: het open bestandsformaat dat ChatGPT, Claude, Cursor en elke AI-tool on-brand houdt. Gratis, zonder account.',
  openGraph: {
    title: 'Maak van elke website een brand.md',
    description:
      'Gratis generator voor de open standaard voor merkidentiteit. Strategie, stem, kleuren, typografie en doelgroep — in één bestand dat elke AI-tool kan lezen.',
  },
};

export default function BrandMdGeneratorPage() {
  return <GeneratorClient />;
}
