// Platform-overzicht — de volle breedte op één pagina, gegroepeerd langs de
// merk-loop: fundament → onderzoek → genereren → bewaken. NL-first (Fase 3,
// website-verbeterplan v2). De 7 losse detailpagina's onder
// /marketing/features/[slug] zijn hierin opgegaan (besluit Erik): elke module
// opent nu een lightbox in plaats van door te linken naar een aparte pagina.

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { appHref } from '../app-url';
import SplitHeader from '../SplitHeader';
import TrialNote from '../TrialNote';
import PlatformStepper from './PlatformStepper';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/platform' },
  title: 'Platform',
  description:
    'Eén merkplatform: merk-DNA, onderzoek, content, campagnes, beeld en AI-agents, met een merk-check op elke output.',
};

export default function PlatformPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <SplitHeader
        id="platform-hero"
        family="product"
        eyebrow="Platform"
        title="Eén merkplatform, van fundament tot bewaking"
        lead="Alles draait op hetzelfde merk-DNA: leg je merk één keer vast, onderzoek je markt, genereer on-brand en laat agents het bewaken."
        className="mb-14"
      />

      {/* Stepper: de 4 stappen van de merk-loop lopen na elkaar, met een
          genummerde rail + doorlopende lijn zodat de volgorde zichtbaar is
          i.p.v. losse blokken. Client-component (lightbox-state +
          ?feature=<slug>-deep-link via useSearchParams, vandaar de Suspense-
          boundary die Next daarvoor eist). */}
      <Suspense fallback={null}>
        <PlatformStepper />
      </Suspense>

      {/* CTA */}
      <div className="mt-16 pt-10 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=platform-overview')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/pricing"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Bekijk prijzen
        </Link>
        <TrialNote />
      </div>
    </div>
  );
}
