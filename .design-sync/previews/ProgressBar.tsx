import { ProgressBar } from 'branddock-app';

const Rij = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="max-w-md space-y-1">
    <p className="text-sm text-gray-600">{label}</p>
    {children}
  </div>
);

export const MetLabel = () => (
  <Rij label="Merk-assets ingevuld">
    <ProgressBar value={75} showLabel />
  </Rij>
);

export const Kleuren = () => (
  <div className="max-w-md space-y-4">
    <Rij label="Brand Score (teal)"><ProgressBar value={84} color="teal" /></Rij>
    <Rij label="Credits verbruikt (amber)"><ProgressBar value={62} color="amber" /></Rij>
    <Rij label="Boven limiet (rood)"><ProgressBar value={96} color="red" /></Rij>
  </div>
);

export const Klein = () => (
  <Rij label="Compacte variant">
    <ProgressBar value={40} size="sm" />
  </Rij>
);
