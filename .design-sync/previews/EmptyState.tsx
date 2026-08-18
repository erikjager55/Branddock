import { EmptyState } from 'branddock-app';
import { Users, FileText, Radar } from 'lucide-react';

export const MetActie = () => (
  <EmptyState
    icon={Users}
    title="Nog geen persona's"
    description="Persona's bepalen voor wie Branddock schrijft. Begin met je belangrijkste doelgroep."
    action={{ label: "Persona aanmaken", onClick: () => {} }}
  />
);

export const ZonderActie = () => (
  <EmptyState
    icon={Radar}
    title="Geen trends gevonden"
    description="De Trend Radar heeft deze week niets gesignaleerd dat aan je merk raakt."
  />
);

export const SecundaireActie = () => (
  <EmptyState
    icon={FileText}
    title="Nog niets gepubliceerd"
    description="Zodra je een deliverable goedkeurt verschijnt die hier."
    action={{ label: "Naar Content Studio", onClick: () => {}, variant: "secondary" }}
  />
);
