import { CrossLinkCard } from 'branddock-app';
import { Mic2, Palette } from 'lucide-react';

export const Teal = () => (
  <CrossLinkCard
    icon={Mic2}
    title="Brand Voice"
    description="Je merkstem bepaalt hoe elke gegenereerde tekst klinkt."
    ctaLabel="Naar Brand Voice"
    onClick={() => {}}
  />
);

export const Violet = () => (
  <CrossLinkCard
    icon={Palette}
    title="Brandstyle"
    description="Kleuren, typografie en beeldtaal voeden de stijl-pijler van F-VAL."
    ctaLabel="Naar Brandstyle"
    onClick={() => {}}
    accent="violet"
  />
);
