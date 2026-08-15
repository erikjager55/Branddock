import type { Metadata } from 'next';
import { ArrowRight, Bot, FileText, MessageSquare, TerminalSquare } from 'lucide-react';

// Use-hub (touchpoint 1.6) — publiek, geen e-mail vereist. Documenteert het
// bestánd, niet Branddock; de claim-CTA staat één keer, onderaan (don't uit
// de touchpoint-strategie). Tevens SEO-asset ("brand.md gebruiken") en het
// antwoord voor ontvangers van andermans bestand (derde bestand-regel).
// Styling: marketing-site (licht, mkt-tokens) — integratie 2026-08-14.
// Nederlands sinds 2026-08-15 (user-besluit); dit draait het EN-first uit
// launch-plan §6 terug voor de publieke brand.md-pagina's.

export const metadata: Metadata = {
  title: 'Zo gebruik je een brand.md — Claude, ChatGPT, Cursor & agents | Branddock',
  description:
    'Heb je een brand.md-bestand? Dit is de setup van dertig seconden voor Claude, ChatGPT, Cursor en elke AI-chat — zodat alles wat eruit komt klinkt als het merk.',
};

const ACCENT_INK = 'var(--link-ink)';

const GUIDES = [
  {
    icon: Bot,
    tool: 'Claude',
    steps: [
      'Maak een Project aan (claude.ai → Projects → New).',
      'Sleep het brand.md-bestand in de Project-kennis.',
      'Elke chat in dat Project is nu on-brand — zonder dat je erom hoeft te vragen.',
    ],
    test: 'Vraag: "Schrijf een LinkedIn-post over ons product." Vergelijk het met een chat zonder het bestand.',
  },
  {
    icon: MessageSquare,
    tool: 'ChatGPT',
    steps: [
      'Open het brand.md-bestand en kopieer de Voice-sectie.',
      'Instellingen → Personalisatie → Aangepaste instructies.',
      'Plak het onder "Hoe wil je dat ChatGPT reageert?".',
    ],
    test: 'Vraag om een productomschrijving — woordkeuze en toon horen direct te verschuiven.',
  },
  {
    icon: TerminalSquare,
    tool: 'Cursor & coding-agents',
    steps: [
      'Zet BRAND.md in de root van je repo, naast AGENTS.md of CLAUDE.md.',
      'Meer is het niet — agents die repo-context lezen pakken het vanzelf op.',
      'Voor UI-werk: de Visual-sectie bevat je kleuren en lettertypes.',
    ],
    test: 'Laat de agent UI-teksten of een foutmelding schrijven — die horen je stemregels te volgen.',
  },
  {
    icon: FileText,
    tool: 'Elke AI-chat',
    steps: [
      'Open het bestand — het is maar zo\'n twee pagina\'s leesbare markdown.',
      'Plak het geheel boven je prompt.',
      'Voeg toe: "Volg deze brand.md voor alles wat je schrijft."',
    ],
    test: 'Werkt vandaag in elk taalmodel, zonder integratie — dat is precies het punt van het formaat.',
  },
];

export default function BrandMdUsePage() {
  return (
    <div className="mkt-hero-glow">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="mkt-accent text-sm font-semibold uppercase tracking-wide">
          brand.md — de open standaard voor merkidentiteit
        </p>
        <h1 className="mt-3">Zo gebruik je een brand.md</h1>
        <p className="mt-3 max-w-xl text-lg text-gray-600">
          Eén markdown-bestand dat elke AI-tool vertelt hoe een merk eruitziet, klinkt en zich
          gedraagt. Hieronder de setup van dertig seconden, per tool.
        </p>

        <div className="mt-10 space-y-6">
          {GUIDES.map((g) => (
            <section
              key={g.tool}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h2 className="flex items-center gap-2 text-xl">
                <g.icon className="h-5 w-5" style={{ color: ACCENT_INK }} />
                {g.tool}
              </h2>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
                {g.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-gray-500">
                <span className="font-medium text-gray-700">Probeer het: </span>
                {g.test}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          <p>
            <span className="font-semibold text-gray-900">Nog geen brand.md?</span> Genereer er
            een vanaf elke website-URL — gratis, zonder account.
          </p>
          <a
            href="/brandmd"
            className="mkt-accent mt-2 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            Genereer je brand.md <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs text-gray-500">
            Een gegenereerd bestand markeert wat het niet kon verifiëren als <code>unvalidated</code>.
            De levende, bevestigde versie — altijd actueel, automatisch aan je tools geserveerd —
            staat in een Branddock-workspace. Spec:{' '}
            <a href="https://thebrand.md" rel="noopener" className="underline underline-offset-2">
              thebrand.md
            </a>{' '}
            (v0.3, open standaard).
          </p>
        </div>
      </div>
    </div>
  );
}
