import { StyleGuidelinesEditor } from 'branddock-app';

export const Ingevuld = () => (
  <StyleGuidelinesEditor
    dos={"Natuurlijk daglicht\nEchte werkplekken, geen studio-opstellingen\nMensen in gesprek, niet poserend"}
    donts={"Geen stockfoto-glimlach\nGeen overvolle bureaus\nGeen felle kleurfilters"}
    onDosChange={() => {}}
    onDontsChange={() => {}}
  />
);

export const Leeg = () => (
  <StyleGuidelinesEditor
    dos=""
    donts=""
    onDosChange={() => {}}
    onDontsChange={() => {}}
    dosPlaceholder="Wat moet er altijd in je beeld zitten?"
    dontsPlaceholder="Wat wil je nooit terugzien?"
  />
);
