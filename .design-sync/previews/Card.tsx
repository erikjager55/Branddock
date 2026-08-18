import { Card } from 'branddock-app';

const Inhoud = ({ titel, tekst }: { titel: string; tekst: string }) => (
  <>
    <h3 className="text-base font-semibold text-gray-900">{titel}</h3>
    <p className="mt-1 text-sm text-gray-600">{tekst}</p>
  </>
);

export const Standaard = () => (
  <Card>
    <Inhoud titel="Merkfundament" tekst="Positionering, missie en kernwaarden in één plek." />
  </Card>
);

export const Klikbaar = () => (
  <Card hoverable onClick={() => {}}>
    <Inhoud titel="Persona openen" tekst="Hoverbaar en klikbaar — gebruik dit voor kaarten in een overzicht." />
  </Card>
);

export const PaddingVarianten = () => (
  <div className="space-y-3">
    <Card padding="sm"><Inhoud titel="Compact" tekst="padding sm" /></Card>
    <Card padding="lg"><Inhoud titel="Ruim" tekst="padding lg" /></Card>
  </div>
);

export const ZonderRand = () => (
  <Card border={false}>
    <Inhoud titel="Zonder rand" tekst="Voor kaarten op een gekleurde ondergrond." />
  </Card>
);
