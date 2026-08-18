import { SelectionCard } from 'branddock-app';
import { FileText, Megaphone, Image as ImageIcon } from 'lucide-react';

const noop = () => {};

export const RadioGeselecteerd = () => (
  <SelectionCard
    icon={FileText}
    title="Blogartikel"
    subtitle="800-1500 woorden, SEO-geoptimaliseerd"
    selected
    selectionMode="radio"
    onSelect={noop}
  />
);

export const RadioNietGeselecteerd = () => (
  <SelectionCard
    icon={Megaphone}
    title="LinkedIn-post"
    subtitle="Kort, met haak in de eerste regel"
    selectionMode="radio"
    onSelect={noop}
  />
);

export const CheckboxGeselecteerd = () => (
  <SelectionCard
    icon={ImageIcon}
    title="Beeldmateriaal"
    subtitle="Genereer passend beeld bij de tekst"
    selected
    selectionMode="checkbox"
    onSelect={noop}
  />
);

export const MetInhoud = () => (
  <SelectionCard
    icon={FileText}
    title="Landingspagina"
    subtitle="Volledige pagina met secties en leadformulier"
    selected
    onSelect={noop}
  >
    <p className="mt-2 text-xs text-gray-500">
      Levert vier varianten op; je kiest er één en publiceert die op je eigen domein.
    </p>
  </SelectionCard>
);
