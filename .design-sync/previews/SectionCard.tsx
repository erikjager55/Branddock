import { SectionCard } from 'branddock-app';
import { Target, Palette, Mic2 } from 'lucide-react';

export const MetHogeImpact = () => (
  <SectionCard
    icon={Target}
    title="Positionering"
    subtitle="Waar je merk voor staat, in één zin"
    impactBadge="high"
  >
    <p className="text-sm text-gray-600">
      De positionering voedt elke AI-call. Zonder scherpe positionering valt de generator
      terug op algemene taal en zakt de merkherkenning meetbaar.
    </p>
  </SectionCard>
);

export const MetGemiddeldeImpact = () => (
  <SectionCard
    icon={Palette}
    title="Brandstyle"
    subtitle="Kleuren, typografie en beeldtaal"
    impactBadge="medium"
  >
    <p className="text-sm text-gray-600">
      Gescand van je website en aangevuld met eigen regels. Voedt de stijl-pijler van F-VAL.
    </p>
  </SectionCard>
);

export const MetLageImpact = () => (
  <SectionCard
    icon={Mic2}
    title="Kanaal-tonen"
    subtitle="Afwijkende toon per kanaal"
    impactBadge="low"
  >
    <p className="text-sm text-gray-600">
      Optioneel. Zonder invulling gebruikt elk kanaal de algemene merkstem.
    </p>
  </SectionCard>
);

export const ZonderBadge = () => (
  <SectionCard title="Kennisbronnen" subtitle="Documenten die de AI mag raadplegen">
    <p className="text-sm text-gray-600">
      Zeven bronnen geïndexeerd. Nieuwe uploads zijn binnen een minuut doorzoekbaar.
    </p>
  </SectionCard>
);
