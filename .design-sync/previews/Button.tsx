import { Button } from 'branddock-app';
import { Plus, Download, Trash2 } from 'lucide-react';

const Rij = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

export const Varianten = () => (
  <Rij>
    <Button variant="primary">Genereren</Button>
    <Button variant="secondary">Opslaan</Button>
    <Button variant="cta">Start gratis proef</Button>
    <Button variant="danger">Verwijderen</Button>
    <Button variant="ghost">Annuleren</Button>
  </Rij>
);

export const Formaten = () => (
  <Rij>
    <Button size="sm">Klein</Button>
    <Button size="md">Normaal</Button>
    <Button size="lg">Groot</Button>
  </Rij>
);

export const MetIcoon = () => (
  <Rij>
    <Button icon={Plus}>Nieuwe persona</Button>
    <Button variant="secondary" icon={Download} iconPosition="right">
      Exporteren
    </Button>
    <Button variant="danger" icon={Trash2}>
      Verwijderen
    </Button>
  </Rij>
);

export const Toestanden = () => (
  <Rij>
    <Button isLoading>Genereren</Button>
    <Button disabled>Niet beschikbaar</Button>
  </Rij>
);

export const VolleBreedte = () => (
  <div className="max-w-sm">
    <Button fullWidth icon={Plus}>
      Deliverable toevoegen
    </Button>
  </div>
);
