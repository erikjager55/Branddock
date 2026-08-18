import { GradientBanner } from 'branddock-app';

const Inhoud = ({ titel, sub }: { titel: string; sub: string }) => (
  <div className="flex items-center gap-4 px-6">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-semibold text-white">
      {titel.slice(0, 2).toUpperCase()}
    </div>
    <div>
      <p className="text-lg font-semibold text-white">{titel}</p>
      <p className="text-sm text-white/80">{sub}</p>
    </div>
  </div>
);

export const MetInhoud = () => (
  <GradientBanner moduleKey="personas">
    <Inhoud titel="Marketingmanager MKB" sub="Primaire doelgroep · 5 campagnes" />
  </GradientBanner>
);

export const Laag = () => <GradientBanner moduleKey="brandstyle" height="sm" />;

export const AndereGradient = () => (
  <GradientBanner moduleKey="campaigns">
    <Inhoud titel="Najaarscampagne" sub="Concept · 8 deliverables" />
  </GradientBanner>
);

export const AndereModule = () => (
  <GradientBanner moduleKey="research" height="md">
    <Inhoud titel="Marktonderzoek" sub="12 bronnen · laatst bijgewerkt vandaag" />
  </GradientBanner>
);
