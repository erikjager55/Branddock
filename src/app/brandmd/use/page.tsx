import type { Metadata } from 'next';
import { ArrowRight, Bot, FileText, MessageSquare, TerminalSquare } from 'lucide-react';

// Use-hub (touchpoint 1.6) — publiek, geen e-mail vereist. Documenteert het
// bestánd, niet Branddock; de claim-CTA staat één keer, onderaan (don't uit
// de touchpoint-strategie). Tevens SEO-asset ("how to use brand.md") en het
// antwoord voor ontvangers van andermans bestand (derde bestand-regel).
// Styling: marketing-site (licht, mkt-tokens) — integratie 2026-08-14.

export const metadata: Metadata = {
  title: 'How to use a brand.md file — Claude, ChatGPT, Cursor & agents | Branddock',
  description:
    'Got a brand.md file? Here is the 30-second setup for Claude, ChatGPT, Cursor and any AI chat — so every output sounds like the brand.',
};

const ACCENT_INK = 'var(--link-ink)';

const GUIDES = [
  {
    icon: Bot,
    tool: 'Claude',
    steps: [
      'Create a Project (claude.ai → Projects → New).',
      'Drag the brand.md file into the Project knowledge.',
      'Every chat in that Project is now on-brand — no prompting needed.',
    ],
    test: 'Ask: "Write a LinkedIn post about our product." Compare it with a chat without the file.',
  },
  {
    icon: MessageSquare,
    tool: 'ChatGPT',
    steps: [
      'Open the brand.md file and copy the Voice section.',
      'Settings → Personalization → Custom Instructions.',
      'Paste it under "How would you like ChatGPT to respond?".',
    ],
    test: 'Ask for a product description — the vocabulary and tone should shift immediately.',
  },
  {
    icon: TerminalSquare,
    tool: 'Cursor & coding agents',
    steps: [
      'Drop brand.md in your repo root, next to AGENTS.md or CLAUDE.md.',
      "That's it — agents that read repo context pick it up automatically.",
      'For UI work: the Visual section carries your colors and typography.',
    ],
    test: 'Ask the agent to write UI copy or an error message — it should match your voice rules.',
  },
  {
    icon: FileText,
    tool: 'Any AI chat',
    steps: [
      "Open the file — it's only ~2 pages of readable markdown.",
      'Paste the whole thing above your prompt.',
      'Add: "Follow this brand.md for everything you write."',
    ],
    test: 'Works in every LLM, today, with zero integration — that is the point of the format.',
  },
];

export default function BrandMdUsePage() {
  return (
    <div className="mkt-hero-glow">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="mkt-accent text-sm font-semibold uppercase tracking-wide">
          brand.md — the open brand-identity standard
        </p>
        <h1 className="mt-3">How to use a brand.md file</h1>
        <p className="mt-3 max-w-xl text-lg text-gray-600">
          One markdown file that tells every AI tool how a brand looks, sounds and behaves. Here is
          the 30-second setup per tool.
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
                <span className="font-medium text-gray-700">Try it: </span>
                {g.test}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
          <p>
            <span className="font-semibold text-gray-900">No brand.md yet?</span> Generate one
            from any website URL — free, no account.
          </p>
          <a
            href="/brandmd"
            className="mkt-accent mt-2 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            Generate your brand.md <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-4 text-xs text-gray-500">
            A generated file marks what it could not verify as <code>unvalidated</code>. The living,
            validated version — always current, served to your tools automatically — lives in a
            Branddock workspace. Spec:{' '}
            <a href="https://thebrand.md" rel="noopener" className="underline underline-offset-2">
              thebrand.md
            </a>{' '}
            (v0.2, open standard).
          </p>
        </div>
      </div>
    </div>
  );
}
