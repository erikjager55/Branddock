import { ComingSoonPage } from 'branddock-app';

export const MetKenmerken = () => (
  <ComingSoonPage
    title="Brand Monitor"
    description="Volg automatisch waar je merk online genoemd wordt en of die vermeldingen on-brand zijn."
    phase="Gepland voor Q4"
    icon="Radar"
    features={[
      'Dagelijkse scan op merkvermeldingen',
      'Toon- en sentimentanalyse per bron',
      'Signaal wanneer een concurrent je claim overneemt',
    ]}
    onBack={() => {}}
  />
);

export const Minimaal = () => (
  <ComingSoonPage
    title="Team-rapportages"
    description="Maandelijkse export van wat je team publiceerde en hoe on-brand dat was."
  />
);
