import { PageHeader } from 'branddock-app';
import { Plus, Download, Sparkles } from 'lucide-react';

const Btn = ({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'ghost' }) => (
  <button
    className={
      variant === 'primary'
        ? 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white'
        : 'inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700'
    }
  >
    {children}
  </button>
);

export const Standaard = () => (
  <PageHeader
    moduleKey="personas"
    title="Persona's"
    subtitle="De doelgroepen waarvoor Branddock content schrijft en valideert."
    actions={
      <Btn>
        <Plus className="h-4 w-4" />
        Nieuwe persona
      </Btn>
    }
  />
);

export const MetMeerdereActies = () => (
  <PageHeader
    moduleKey="content-library"
    title="Content Library"
    subtitle="Alles wat is gegenereerd, gepubliceerd of nog in review staat."
    actions={
      <div className="flex items-center gap-2">
        <Btn variant="ghost">
          <Download className="h-4 w-4" />
          Exporteren
        </Btn>
        <Btn>
          <Sparkles className="h-4 w-4" />
          Genereren
        </Btn>
      </div>
    }
  />
);

export const Compact = () => (
  <PageHeader
    compact
    moduleKey="campaigns"
    title="Campagnes"
    subtitle="Lopende en geplande campagnes."
  />
);

export const ZonderSubtitel = () => <PageHeader moduleKey="research" title="Research" />;
