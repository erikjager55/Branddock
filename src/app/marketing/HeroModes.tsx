'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import { appHref } from './app-url';
import BookDemoButton from './BookDemoButton';
import Mosaic, { MOSAIC_PRODUCT } from './Mosaic';
// UX-04: statische import → Next genereert een blur-placeholder, zodat het
// hero-paneel nooit seconden leeg-wit staat terwijl de grote PNG laadt.
import agentsShot from '../../../public/marketing/features/agents.png';

// Hero met modus-switch (Postiz-patroon, besluit Erik 2026-07-19): één toggle
// die het hele hero-verhaal wisselt tussen "in het platform" (het AI-team in
// Branddock) en "in je AI-agent" (de MCP-connector in Claude/ChatGPT/n8n).
// Zelfde layout-skelet (mkt-hero__ink/mosaic/meta); alleen copy, CTA's en de
// visual wisselen. Claims-grens: geen autopilot-taal, "jij keurt goed" blijft.

type HeroMode = 'platform' | 'agent';

export default function HeroModes() {
  const [mode, setMode] = useState<HeroMode>('platform');

  return (
    <section className="mkt-hero relative">
      {/* UX-19 → herzien: de toggle is het signatuur-element en staat nu als
          eigen rij bovenaan, gecentreerd over de volle breedte. In de
          tekstkolom concurreerde hij met de H1 en werd hij gemist. */}
      <div className="mkt-hero__switch">
        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Waar werk je?
        </p>
        <div
          role="group"
          aria-label="Kies hoe je met Branddock werkt"
          className="mkt-hero__switch-track"
        >
          <ModeButton
            active={mode === 'platform'}
            onClick={() => setMode('platform')}
            label="In het platform"
          />
          <ModeButton
            active={mode === 'agent'}
            onClick={() => setMode('agent')}
            label="In je AI-agent"
          />
        </div>
      </div>

      <div className="mkt-hero__ink">
        <div className="max-w-lg">{mode === 'platform' ? <PlatformInk /> : <AgentInk />}</div>
      </div>

      <div className="mkt-hero__mosaic">
        <Mosaic
          id="hero"
          cols={7}
          rows={5}
          palette={MOSAIC_PRODUCT}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.92 }}
        />
        <div className="mkt-hero__shot mkt-frame">
          <div className="mkt-frame__bar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          {mode === 'platform' ? (
            <Image
              src={agentsShot}
              alt="Het Branddock-agentteam: negen AI-agents met eigen rollen, van onderzoek tot merkbewaking"
              placeholder="blur"
              sizes="(max-width: 768px) 100vw, 46vw"
              className="w-full h-auto"
              priority
            />
          ) : (
            <AgentChatMock />
          )}
        </div>
      </div>

      <div className="mkt-hero__meta">
        <div className="mkt-hero__meta-inner">
          <div className="mkt-hero__meta-item">
            <b>Modellen</b>
            <span>Claude · GPT · Gemini</span>
          </div>
          <div className="mkt-hero__meta-item">
            <b>Data</b>
            {/* UX-05: de AVG-claim klikt door naar de onderbouwing. */}
            <span>
              <Link href="/marketing/security" className="hover:underline">
                EU-hosting · AVG-proof
              </Link>
            </span>
          </div>
          <div className="mkt-hero__meta-item">
            <b>Start</b>
            <span>28 dagen gratis · geen creditcard</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-6 py-2.5 text-sm transition-all ${
        active ? 'bg-white font-semibold shadow-md' : 'text-white font-medium hover:bg-white/10'
      }`}
      style={active ? { color: 'var(--brand-slate)' } : undefined}
    >
      {label}
    </button>
  );
}

function PlatformInk() {
  return (
    <>
      <h1 className="mb-6" style={{ color: '#ffffff' }}>
        Een AI-marketingteam dat je merk écht kent.
      </h1>
      <p className="text-xl mb-8" style={{ color: 'rgba(255,255,255,0.9)' }}>
        AI-agents doen het werk: onderzoek, strategie, content, merkbewaking. Alles op jouw
        merk-DNA. Iedere uiting wordt gescoord of het bij je merk past en resoneert bij je
        doelgroep(en).
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=hero')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white font-medium hover:opacity-90"
          style={{ color: 'var(--brand-slate)' }}
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
        <BookDemoButton className="inline-flex items-center px-6 py-3 rounded-lg border border-white/40 text-white font-medium hover:bg-white/10" />
      </div>
    </>
  );
}

function AgentInk() {
  return (
    <>
      <h1 className="mb-6" style={{ color: '#ffffff' }}>
        Geef Claude en ChatGPT je merk-DNA.
      </h1>
      <p className="text-xl mb-8" style={{ color: 'rgba(255,255,255,0.9)' }}>
        Koppel Branddock als connector en je agent kent je merk: volledige merkcontext, on-brand
        genereren en een meetbare merk-check (F-VAL). Direct in de applicatie waar jij al in
        werkt.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=hero-agent')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white font-medium hover:opacity-90"
          style={{ color: 'var(--brand-slate)' }}
        >
          Gratis proberen <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/marketing/voor-ai-agents"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-white/40 text-white font-medium hover:bg-white/10"
        >
          Bekijk de koppel-stappen
        </Link>
      </div>
      <p className="mt-5 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
        Werkt met: Claude, ChatGPT, n8n en elke MCP-client
      </p>
    </>
  );
}

/**
 * Gestileerde chat-mock voor de agent-modus — geen screenshot van een
 * derde-partij-UI (claim-veilig), wél het echte contract: merkcontext-tool,
 * on-brand generatie, F-VAL-badge, goedkeuring bij de mens.
 */
function AgentChatMock() {
  return (
    <div className="bg-white p-5" style={{ minHeight: '20rem' }}>
      <div className="flex justify-end mb-4">
        <div className="max-w-xs rounded-xl px-4 py-2.5 text-sm text-white" style={{ background: 'var(--brand-slate)' }}>
          Schrijf een LinkedIn-post over onze nieuwe dienst, voor persona Laura.
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <ToolChip name="get_brand_context" />
        <ToolChip name="generate_on_brand" />
      </div>
      <div className="max-w-md rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          Hier is je concept, geschreven in jullie merkstem, gericht op Laura, met de
          kernboodschap uit je merk-DNA. Zal ik hem in de bibliotheek zetten voor review?
        </p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: 'rgba(7,229,171,0.12)', color: 'var(--brand-slate)' }}
        >
          <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} /> F-VAL 86 · on-brand
        </span>
      </div>
    </div>
  );
}

function ToolChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-mono text-gray-600">
      <Check className="w-3 h-3" style={{ color: 'var(--primary)' }} /> {name}
    </span>
  );
}
