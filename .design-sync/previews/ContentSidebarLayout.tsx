import { ContentSidebarLayout } from 'branddock-app';

const Zijbalk = () => (
  <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Merkcontext</p>
      <p className="mt-2 text-sm text-gray-600">Persona: Marketingmanager MKB</p>
      <p className="text-sm text-gray-600">Toon: helder, zonder jargon</p>
    </div>
    <div className="border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">F-VAL</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">86</p>
      <p className="text-xs text-gray-400">drempel 70</p>
    </div>
  </div>
);

const Artikel = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-6">
    <h2 className="text-xl font-semibold text-gray-900">Waarom merkconsistentie schaalt</h2>
    <p className="mt-3 text-sm leading-relaxed text-gray-600">
      Wie elke uiting los bedenkt, betaalt twee keer: eerst voor het bedenken en daarna voor
      het herstellen van wat niet klopt. Een vastgelegd merkfundament verplaatst die kosten
      naar één plek.
    </p>
    <p className="mt-3 text-sm leading-relaxed text-gray-600">
      Dat is precies wat de context-stack doet: elk model krijgt dezelfde merk-DNA mee, zodat
      afwijking de uitzondering wordt in plaats van de regel.
    </p>
  </div>
);

export const Standaard = () => (
  <ContentSidebarLayout sidebar={<Zijbalk />}>
    <Artikel />
  </ContentSidebarLayout>
);

export const BredeZijbalk = () => (
  <ContentSidebarLayout sidebarWidth="md" sidebar={<Zijbalk />}>
    <Artikel />
  </ContentSidebarLayout>
);
