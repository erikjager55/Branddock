import { DetailHeader } from 'branddock-app';
import { Pencil, Share2 } from 'lucide-react';

const noop = () => {};

const Badge = ({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'gray' }) => (
  <span
    className={
      tone === 'green'
        ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700'
        : 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'
    }
  >
    {children}
  </span>
);

const Btn = ({ children }: { children: React.ReactNode }) => (
  <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700">
    {children}
  </button>
);

export const Volledig = () => (
  <DetailHeader
    onBack={noop}
    backLabel="Terug naar persona's"
    title="Marketingmanager MKB"
    subtitle="Primaire doelgroep · 5 campagnes"
    avatar={
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-semibold text-white">
        MM
      </div>
    }
    badges={
      <div className="flex items-center gap-2">
        <Badge>Gevalideerd</Badge>
        <Badge tone="gray">B2B</Badge>
      </div>
    }
    actions={
      <div className="flex items-center gap-2">
        <Btn>
          <Share2 className="h-4 w-4" />
          Delen
        </Btn>
        <Btn>
          <Pencil className="h-4 w-4" />
          Bewerken
        </Btn>
      </div>
    }
  />
);

export const AlleenTitel = () => (
  <DetailHeader onBack={noop} title="Nieuwe kennisbron" />
);

export const MetSubtitelEnActie = () => (
  <DetailHeader
    onBack={noop}
    backLabel="Terug naar campagnes"
    title="Najaarscampagne 2026"
    subtitle="Concept · 8 deliverables"
    actions={
      <Btn>
        <Pencil className="h-4 w-4" />
        Bewerken
      </Btn>
    }
  />
);
