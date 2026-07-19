// "F-VAL uitgelegd" — de categorie-definiërende cornerstone (Fase 3,
// website-verbeterplan v2). Legt het merk-fideliteitsmodel uit: 3 pijlers,
// 0–100-schaal, STRICT-rewrite, en de eerlijke pilotcijfers (+7/+12).

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Palette, Scale, ListChecks } from 'lucide-react';
import { appHref } from '../../app-url';
import Mosaic, { MOSAIC_PROOF } from '../../Mosaic';
import SplitHeader from '../../SplitHeader';

export const metadata: Metadata = {
  title: 'F-VAL uitgelegd — de merk-fideliteitsscore van Branddock',
  description:
    'F-VAL geeft elke AI-output een 0–100-score voor merk-fideliteit: stijl (35%), merk-judge (45%) en regels (20%). Onder de norm wordt automatisch herschreven.',
};

const PILLARS = [
  {
    Icon: Palette,
    weight: '35%',
    title: 'Stijl',
    body: 'Hoe dicht zit de tekst bij jóúw merkstem? Gemeten tegen je brand voice — ritme, woordkeuze, toon — via embedding-vergelijking met je eigen materiaal.',
  },
  {
    Icon: Scale,
    weight: '45%',
    title: 'Merk-judge',
    body: 'Een AI-beoordelaar toetst de inhoud aan je merk-DNA: klopt de boodschap met je positionering, waarden en do’s & don’ts? Geen black box — met bevindingen per categorie.',
  },
  {
    Icon: ListChecks,
    weight: '20%',
    title: 'Regels',
    body: 'Deterministische checks: verboden woorden, claims die onderbouwing missen, placeholders, AI-clichés. Hard meetbaar, geen interpretatie.',
  },
];

export default function FvalPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <SplitHeader
        id="fval-hero"
        family="proof"
        eyebrow="Uitgelegd"
        title="F-VAL: de merk-fideliteitsscore"
        lead="Merk-fideliteit is normaal onzichtbaar en subjectief. F-VAL maakt het meetbaar: elke output een score van 0–100 voor hoe goed hij bij jóúw merk past."
        className="mb-12"
      />

      {/* Het probleem */}
      <div className="prose-like max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        <p>
          “Klinkt dit als ons merk?” is in de meeste teams een onderbuikgesprek. De één vindt van
          wel, de ander herschrijft alles. AI maakt dat probleem groter: generieke output komt
          sneller dan ooit, en niemand kan objectief zeggen wat er mis mee is.
        </p>
        <p>
          F-VAL (fidelity validation) beantwoordt die vraag met een getal. Elke generatie in
          Branddock wordt automatisch beoordeeld tegen je merk-DNA — en je ziet niet alleen de
          score, maar ook waaróm: per pijler, met concrete bevindingen.
        </p>
      </div>

      {/* De 3 pijlers */}
      <h2 className="text-gray-900 mb-2">Drie pijlers, één score</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        De score weegt drie onafhankelijke metingen. Zo kan een tekst die “goed klinkt” maar je
        merkregels schendt nooit hoog scoren — en andersom.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-14">
        {PILLARS.map(({ Icon, weight, title, body }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="mkt-tile">
                <Mosaic
                  id={`fval-tile-${title}`}
                  cols={2}
                  rows={2}
                  palette={MOSAIC_PROOF}
                  className="absolute inset-0 w-full h-full"
                />
                <div className="mkt-tile__badge">
                  <i>
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-slate)' }} />
                  </i>
                </div>
              </div>
              <span className="text-2xl font-bold mkt-accent tabular-nums">{weight}</span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Hoe de score werkt */}
      <h2 className="text-gray-900 mb-2">Wat er met de score gebeurt</h2>
      <div className="space-y-4 max-w-2xl mb-14">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Boven de norm → klaar</h3>
          <p className="text-sm text-gray-600">
            Scoort een output boven je drempel (per contenttype instelbaar — een blog mag anders
            klinken dan een LinkedIn-ad), dan is hij klaar voor gebruik.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Onder de norm → automatische herschrijving
          </h3>
          <p className="text-sm text-gray-600">
            STRICT-mode herschrijft de output op basis van de concrete bevindingen — en meet
            opnieuw. Consistentie zonder handwerk.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Altijd inzichtelijk</h3>
          <p className="text-sm text-gray-600">
            Bevindingen zijn gecategoriseerd (stem, terminologie, claims, stijl, AI-clichés) met
            prioriteit en suggestie. Je ziet precies waar het schuurt — en leert je merk er zelf
            scherper van.
          </p>
        </div>
      </div>

      {/* De eerlijke cijfers */}
      <h2 className="text-gray-900 mb-2">Wat het oplevert — eerlijk gemeten</h2>
      <p className="text-gray-600 mb-6 max-w-2xl">
        In onze pilotmeting vergeleken we Branddock-output met vanilla-AI (zelfde briefing, zelfde
        model) per contenttype:
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-6 max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-4xl font-bold mkt-accent tabular-nums">+7</div>
          <div className="text-sm text-gray-600 mt-2">
            punten on-brand gemiddeld, bij een eerlijke, volledige briefing
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-4xl font-bold mkt-accent tabular-nums">+12</div>
          <div className="text-sm text-gray-600 mt-2">
            punten op de nieuwsbrief — het type waar merkstem het zwaarst weegt
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-14 max-w-2xl">
        Geen opgeblazen cijfers: het verschil is het grootst bij magere briefings (waar vanilla-AI
        niets over je merk weet) en bescheidener bij uitgebreide briefings. Dat vertellen we er
        gewoon bij.
      </p>

      {/* CTA */}
      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref('/?utm_source=marketing-site&utm_medium=fval-explainer')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Probeer het op je eigen merk <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/features/brand-alignment"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Bekijk de merk-check-feature
        </Link>
      </div>
    </div>
  );
}
