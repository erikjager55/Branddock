import { Badge } from 'branddock-app';
import { Check, TriangleAlert } from 'lucide-react';

const Rij = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">{children}</div>
);

export const Varianten = () => (
  <Rij>
    <Badge>Concept</Badge>
    <Badge variant="success">Gepubliceerd</Badge>
    <Badge variant="warning">In review</Badge>
    <Badge variant="danger">Afgekeurd</Badge>
    <Badge variant="info">Automatisch</Badge>
    <Badge variant="teal">On-brand</Badge>
  </Rij>
);

export const Formaten = () => (
  <Rij>
    <Badge size="sm" variant="success">Klein</Badge>
    <Badge size="md" variant="success">Normaal</Badge>
  </Rij>
);

export const MetStip = () => (
  <Rij>
    <Badge dot variant="success">Live</Badge>
    <Badge dot variant="warning">Wacht op review</Badge>
    <Badge dot variant="danger">Mislukt</Badge>
  </Rij>
);

export const MetIcoon = () => (
  <Rij>
    <Badge variant="success" icon={Check}>Gevalideerd</Badge>
    <Badge variant="warning" icon={TriangleAlert}>Aandacht nodig</Badge>
  </Rij>
);
