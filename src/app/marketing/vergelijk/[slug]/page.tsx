// Vergelijkingspagina's (P2.3) — één bestand voor drie slugs via [slug],
// patroon gelijk aan features/[slug]. Eerlijkheids-guardrails (hard):
// géén feitelijke claims over andermans prijzen/features/tekortkomingen —
// we beschrijven de CATEGORIE; merknamen alleen als zoek-anker in titel/slug
// plus één neutrale omschrijvingszin; we benoemen expliciet waar de ander
// sterk is en wanneer je die kiest. De vergelijking draait om wat Branddock
// ánders maakt (merklaag, F-VAL-bewijs, credits-alleen-voor-output,
// koppelbaar in Claude/ChatGPT), niet om wat de ander mist.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { appHref } from '../../app-url';
import SplitHeader from '../../SplitHeader';
import type { Metadata } from 'next';

interface CompareSpec {
  slug: string;
  /** H1 — merknaam alleen hier als zoek-anker. */
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** Kernzin onder de H1 — bevat de éne neutrale omschrijvingszin over de ander. */
  lead: string;
  intro: string[];
  /** Waar de categorie sterk in is en wanneer je die kiest — oprecht positief. */
  them: { title: string; points: string[] };
  us: { title: string; points: string[] };
  /** Eerlijke nuance die het "óf-óf"-frame doorbreekt. */
  honestNote: { title: string; body: string };
  differences: { title: string; body: string }[];
}

const COMPARISONS: Record<string, CompareSpec> = {
  jasper: {
    slug: 'jasper',
    title: 'Branddock vs. AI-schrijftools zoals Jasper',
    metaTitle: 'Branddock vs. AI-schrijftools zoals Jasper',
    metaDescription:
      'Eerlijke vergelijking: wanneer een AI-copytool met brand-voice-features past, en wanneer je merk-DNA als fundament nodig hebt — met een meetbare merk-check (F-VAL) op elke uiting.',
    lead: 'Jasper is een bekende AI-copytool voor marketingteams. Dit is een eerlijke vergelijking met die categorie — AI-schrijftools met brand-voice-features — en wanneer je welke kiest.',
    intro: [
      'AI-schrijftools zijn gebouwd om veel copy te produceren: templates, workflows en een brand-voice-instelling die je teksten een herkenbare toon geeft. Voor teams die dagelijks grote volumes tekst draaien is dat een volwassen categorie — en soms precies wat je nodig hebt.',
      'Branddock begint aan de andere kant: niet bij de tekst, maar bij het merk. Je merk-DNA — voice, persona’s, producten, concurrenten, do’s & don’ts — is het fundament onder elke generatie, en elke uiting krijgt een meetbare merk-check (F-VAL, 0–100) met concrete bevindingen. Jij keurt goed voordat iets live gaat.',
    ],
    them: {
      title: 'Wanneer een AI-schrijftool past',
      points: [
        'Je draait hoog-volume copy en zoekt vooral productiesnelheid en templates',
        'Je content-team leeft al in zo’n suite, met ingesleten workflows',
        'Een consistente toon is voldoende — je hebt geen meetbare merk-check per uiting nodig',
      ],
    },
    us: {
      title: 'Wanneer Branddock past',
      points: [
        'Je wilt je merk als fundament: merk-DNA als context van elke generatie, niet een toon-instelling per document',
        'Je wilt bewijs in plaats van onderbuik: een F-VAL-score met concrete bevindingen op elke uiting',
        'Je wilt AI-agents die ook onderzoeken, adviseren en bewaken — niet alleen schrijven',
        'Je werkt al in Claude of ChatGPT en wilt je merklaag dáár koppelen',
      ],
    },
    honestNote: {
      title: 'Eerlijk is eerlijk',
      body: 'Draait je team vooral op tekstvolume en zit iedereen al in een schrijfsuite die goed bevalt? Dan is overstappen niet vanzelfsprekend de juiste keuze. Branddock wordt interessant op het moment dat “klinkt dit als ons?” een vraag is die je meetbaar beantwoord wilt hebben.',
    },
    differences: [
      {
        title: 'Merk-DNA als fundament, niet als feature',
        body: 'Je complete merk — voice, persona’s, producten, concurrenten — is de context van elke AI-call. Geen instelling die je per document aanzet, maar de laag waar alles op draait.',
      },
      {
        title: 'Meetbare validatie in plaats van toon',
        body: 'Elke uiting krijgt een F-VAL-score van 0–100 met bevindingen per categorie. Jij keurt goed vóór publicatie — het merkgesprek wordt een getal in plaats van een gevoel.',
      },
      {
        title: 'Credits alleen voor output',
        body: 'Merkcontext ophalen en teksten laten scoren is gratis, hoe vaak je het ook doet. Credits betaal je alleen als je iets laat máken.',
      },
      {
        title: 'Koppelbaar in je bestaande AI-stack',
        body: 'Via de MCP-connector werkt je merklaag ook in Claude en ChatGPT. Je hoeft je werkplek niet te verhuizen om je merk te bewaken.',
      },
    ],
  },
  chatgpt: {
    slug: 'chatgpt',
    title: 'Branddock vs. losse ChatGPT',
    metaTitle: 'Branddock vs. losse ChatGPT',
    metaDescription:
      'Eerlijke vergelijking: wanneer losse ChatGPT volstaat, en wanneer je een merklaag nodig hebt — merkcontext die er altijd al in zit, een meetbare merk-check (F-VAL), en een connector waarmee Branddock juist ín ChatGPT en Claude werkt.',
    lead: 'ChatGPT is de bekendste AI-chat-assistent. De eerlijke samenvatting: voor incidenteel gebruik volstaat losse chat prima — en Branddock werkt juist ín ChatGPT en Claude, dus het is geen óf-óf.',
    intro: [
      'Een chat-assistent is snel, flexibel en overal: even een mail herschrijven, een idee aftasten, een eerste opzet. Maak je af en toe content en hoeft niemand te bewaken of het on-brand is, dan heb je aan losse chat genoeg.',
      'Het gaat schuren zodra meer mensen — of agents — namens hetzelfde merk schrijven. Dan plak je elke keer opnieuw context in de prompt, klinkt elke collega nét anders, en blijft “klinkt dit als ons?” een onderbuikgesprek. Branddock maakt van je merk een vaste laag: context die er altijd al in zit, en een merk-check (F-VAL) die het antwoord in een getal geeft. Jij keurt goed voordat iets live gaat.',
    ],
    them: {
      title: 'Wanneer losse ChatGPT volstaat',
      points: [
        'Je maakt incidenteel content en er schrijft maar één iemand namens het merk',
        'Je brainstormt, schetst of herschrijft — zonder dat er merkbewaking nodig is',
        'Consistentie over teamleden en kanalen heen is (nog) geen probleem',
      ],
    },
    us: {
      title: 'Wanneer Branddock past',
      points: [
        'Meerdere mensen of agents schrijven namens één merk en moeten hetzelfde klinken',
        'Je wilt merkcontext die er altijd al in zit — niet elke keer opnieuw plakken',
        'Je wilt een meetbare merk-check (F-VAL) vóór publicatie, niet erna',
        'Jij wilt goedkeuren wat live gaat, met bevindingen in plaats van onderbuik',
      ],
    },
    honestNote: {
      title: 'Geen óf-óf: Branddock werkt ín ChatGPT en Claude',
      body: 'Voeg de MCP-connector toe en je chat kent je merk: context ophalen en teksten laten scoren is gratis, credits betaal je alleen als je iets laat maken. En met de browser-extensie (beta) neem je je merk mee naar overal waar je schrijft.',
    },
    differences: [
      {
        title: 'Context die je niet hoeft te plakken',
        body: 'Je merk-DNA — voice, persona’s, producten, concurrenten — is de vaste context van elke generatie. Geen prompt-archeologie, geen “welke versie van de tone-of-voice was dit?”.',
      },
      {
        title: 'Een merk-check met een getal',
        body: 'Elke uiting krijgt een F-VAL-score van 0–100 met concrete bevindingen. Zo wordt “klinkt dit als ons?” een controleerbaar antwoord in plaats van een gevoel.',
      },
      {
        title: 'Credits alleen voor output',
        body: 'Lezen, context ophalen en valideren kost nooit credits. Je betaalt alleen voor wat je laat máken.',
      },
      {
        title: 'Eén merklaag voor je hele stack',
        body: 'Dezelfde merkcontext en dezelfde merk-check in Branddock, in ChatGPT en in Claude — via één connector. Je chat wordt beter, niet overbodig.',
      },
    ],
  },
  'social-schedulers': {
    slug: 'social-schedulers',
    title: 'Branddock vs. social-schedulers (Buffer, Postiz e.d.)',
    metaTitle: 'Branddock vs. social-schedulers (Buffer, Postiz e.d.)',
    metaDescription:
      'Eerlijke vergelijking: schedulers plannen en publiceren uitstekend — Branddock is de laag ervóór: strategie, on-brand generatie en een meetbare merk-check (F-VAL), door te zetten naar de scheduler die je al gebruikt.',
    lead: 'Buffer en Postiz zijn bekende tools om social posts in te plannen en te publiceren. De eerlijke samenvatting: dat doen schedulers uitstekend — Branddock is de laag ervóór, geen vervanging.',
    intro: [
      'Een social-scheduler regelt de logistiek van social: kalender, wachtrijen, publiceren op meerdere kanalen tegelijk. Wie serieus social doet, heeft zoiets nodig — en dat verandert met Branddock niet.',
      'Waar een scheduler ophoudt, begint de vraag wát je post en of het klopt met je merk. Dáár zit Branddock: van strategie naar on-brand generatie naar een meetbare merk-check (F-VAL) — en het goedgekeurde resultaat zet je door naar de scheduler die je al gebruikt. Jij keurt goed voordat iets de kalender in gaat.',
    ],
    them: {
      title: 'Waar een scheduler sterk in is',
      points: [
        'Plannen en publiceren over meerdere kanalen, vanuit één kalender',
        'De publicatie-logistiek: wachtrijen, timing, overzicht voor het team',
        'Als je content elders ontstaat en al bewaakt wordt, is dit alles wat je nodig hebt',
      ],
    },
    us: {
      title: 'Wat Branddock ervóór doet',
      points: [
        'Strategie → generatie → validatie, vóór er iets in de kalender staat',
        'Elke post gemaakt op je merk-DNA, met een F-VAL-score en concrete bevindingen',
        'AI-agents die contentvoorstellen doen — jij keurt goed, niets gaat vanzelf live',
        'Het goedgekeurde resultaat zet je door naar je scheduler',
      ],
    },
    honestNote: {
      title: 'Niet vervangen — aanvullen',
      body: 'Houd je scheduler: die doet de logistiek. Branddock levert aan de voorkant de strategie, de on-brand content en het bewijs dat het klopt — zodat wat er in je kalender staat, ook echt als jouw merk klinkt.',
    },
    differences: [
      {
        title: 'De laag vóór je kalender',
        body: 'Branddock beantwoordt de vraag die aan planning voorafgaat: wat gaan we zeggen, voor wie, en klopt het met ons merk? Strategie, generatie en validatie in één beweging.',
      },
      {
        title: 'Elke post uit je merk-DNA',
        body: 'Voice, persona’s, producten en concurrenten zijn de context van elke generatie — social copy die de juiste snaar raakt, niet generieke vulling voor een leeg slot.',
      },
      {
        title: 'Bewijs vóór publicatie',
        body: 'Elke uiting krijgt een F-VAL-score van 0–100 met bevindingen. Jij keurt goed voordat iets richting je kalender gaat — bewaking aan de voorkant, niet achteraf.',
      },
      {
        title: 'Credits alleen voor output',
        body: 'Context ophalen en valideren is gratis. Credits betaal je alleen voor wat je laat máken — de planning en publicatie blijven waar ze al goed geregeld zijn.',
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(COMPARISONS).map((slug) => ({ slug }));
}

/** Metadata per vergelijking — titel als zoek-anker (merknaam alleen hier). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spec = COMPARISONS[slug];
  if (!spec) return { title: 'Vergelijking niet gevonden' };
  return { title: spec.metaTitle, description: spec.metaDescription };
}

/** Vergelijkings-LP: SplitHeader + wanneer-zij/wanneer-Branddock + verschil-sectie + CTA. */
export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spec = COMPARISONS[slug];
  if (!spec) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <SplitHeader
        id={`vgl-${spec.slug}`}
        family="product"
        eyebrow="Vergelijk"
        title={spec.title}
        lead={spec.lead}
        className="mb-12"
      />

      {/* Context: waar de categorie sterk in is + waar Branddock begint */}
      <div className="max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        {spec.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      {/* 2-koloms: wanneer zij / wanneer Branddock */}
      <h2 className="text-gray-900 mb-2">Wanneer kies je wat?</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Beide kanten hebben een eerlijk antwoord — dit is geen lijstje om de ander af te vallen.
      </p>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{spec.them.title}</h3>
          <ul className="space-y-3">
            {spec.them.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{spec.us.title}</h3>
          <ul className="space-y-3">
            {spec.us.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-gray-600 leading-relaxed">
                <Check className="w-4 h-4 mt-0.5 shrink-0 mkt-accent" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Eerlijke nuance — doorbreekt het óf-óf-frame */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-14 max-w-2xl">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{spec.honestNote.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{spec.honestNote.body}</p>
      </div>

      {/* Verschil-sectie: wat Branddock ánders maakt */}
      <h2 className="text-gray-900 mb-2">Wat Branddock anders maakt</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Niet wat de ander mist, maar waar Branddock op is gebouwd: de merklaag onder je
        marketing.
      </p>
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {spec.differences.map(({ title, body }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-14 max-w-2xl">
        Hoeveel scheelt het? In onze pilotmeting gemiddeld +7 punten on-brand vs. vanilla-AI bij
        een eerlijke, volledige briefing (en +12 op de nieuwsbrief); het verschil is het grootst
        bij magere briefings. Meer over de meting:{' '}
        <Link href="/marketing/resources/f-val" className="underline hover:text-gray-600">
          F-VAL uitgelegd
        </Link>
        .
      </p>

      {/* Compacte CTA: trial + guardrails-link */}
      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref(`/?view=register&utm_source=marketing-site&utm_medium=vergelijk-${spec.slug}`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Branddock proberen <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/guardrails"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Koppel je agent — gratis lezen &amp; valideren
        </Link>
      </div>
    </div>
  );
}
