import { StatGrid } from 'branddock-app';

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
  </div>
);

export const VierKolommen = () => (
  <StatGrid>
    <Stat label="Merk-assets" value="9 / 12" hint="3 in review" />
    <Stat label="Persona's" value="5" hint="2 gevalideerd" />
    <Stat label="Concurrenten" value="8" hint="wekelijks gescand" />
    <Stat label="Brand Score" value="84" hint="+6 sinds vorige scan" />
  </StatGrid>
);

export const DrieKolommen = () => (
  <StatGrid columns={3}>
    <Stat label="Gepubliceerd" value="27" hint="deze maand" />
    <Stat label="In review" value="4" />
    <Stat label="Gemiddelde F-VAL" value="82" hint="drempel 70" />
  </StatGrid>
);

export const TweeKolommen = () => (
  <StatGrid columns={2}>
    <Stat label="Credits verbruikt" value="12.480" hint="van 20.000" />
    <Stat label="Actieve agents" value="9" hint="3 draaien nu" />
  </StatGrid>
);
