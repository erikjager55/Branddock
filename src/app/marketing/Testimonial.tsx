// V2-04 proof-pack — herbruikbaar bewijs-element voor home/pricing/solutions.
// Zolang er geen vrijgegeven pilotquotes zijn, rendert hij de feitelijke
// pilot-regel (géén verzonnen namen of cijfers — voice-regel). Een quote
// toevoegen = één object invullen; de placeholder verdwijnt dan vanzelf.
import { MessageSquareQuote } from 'lucide-react';

type Quote = { text: string; name: string; role: string; company: string };

// TODO(Erik): pilotquotes met toestemming invullen (V2-04) — per context één.
const QUOTES: Record<'home' | 'pricing' | 'marketingteams' | 'bureaus', Quote | null> = {
  home: null,
  pricing: null,
  marketingteams: null,
  bureaus: null,
};

const FALLBACK: Record<keyof typeof QUOTES, string> = {
  home: 'Gebouwd en getest met pilotmerken uit het Nederlandse MKB en de bureauwereld — elke uiting die zij maken krijgt dezelfde merk-check die jij hier ziet.',
  pricing:
    'De pilotmerken draaien op deze plannen — zelfde prijzen, zelfde gratis merk-check, geen aparte afspraken.',
  marketingteams:
    'Gebouwd en getest met marketingteams uit het Nederlandse MKB — hun rework-frustratie was het startpunt van de merk-check.',
  bureaus:
    'Gebouwd en getest met de bureauwereld als eerste gebruiker: Branddock is ontstaan in de praktijk van een merkbureau.',
};

export default function Testimonial({
  context,
  className,
}: {
  context: keyof typeof QUOTES;
  className?: string;
}) {
  const quote = QUOTES[context];

  if (!quote) {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 flex items-start gap-3 ${className ?? ''}`}
      >
        <MessageSquareQuote className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--link-ink)' }} />
        <p className="text-sm text-gray-600">{FALLBACK[context]}</p>
      </div>
    );
  }

  return (
    <figure className={`rounded-xl border border-gray-200 bg-white p-6 ${className ?? ''}`}>
      <blockquote className="text-gray-800 leading-relaxed mb-3">“{quote.text}”</blockquote>
      <figcaption className="text-sm text-gray-500">
        {quote.name} · {quote.role}, {quote.company}
      </figcaption>
    </figure>
  );
}
