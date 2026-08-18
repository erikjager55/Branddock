import { Input } from 'branddock-app';
import { Mail, Search } from 'lucide-react';

const Kolom = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-sm space-y-4">{children}</div>
);

export const MetLabel = () => (
  <Kolom>
    <Input label="Merknaam" placeholder="Bijv. Branddock" defaultValue="" />
  </Kolom>
);

export const MetHulptekst = () => (
  <Kolom>
    <Input
      label="Website"
      placeholder="https://jouwmerk.nl"
      helperText="We scannen deze pagina om je merk-DNA op te bouwen."
    />
  </Kolom>
);

export const MetFout = () => (
  <Kolom>
    <Input label="E-mailadres" defaultValue="erik@" error="Vul een geldig e-mailadres in." icon={Mail} />
  </Kolom>
);

export const MetIcoon = () => (
  <Kolom>
    <Input icon={Search} placeholder="Zoek in je content..." />
  </Kolom>
);

export const Uitgeschakeld = () => (
  <Kolom>
    <Input label="Workspace-ID" defaultValue="ws_8f2c1a" disabled helperText="Niet aanpasbaar." />
  </Kolom>
);
