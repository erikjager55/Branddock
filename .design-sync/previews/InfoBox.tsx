import { InfoBox } from 'branddock-app';

export const Info = () => (
  <InfoBox variant="info" title="Merkcontext wordt meegestuurd">
    Elke generatie krijgt je merk-DNA mee. Vul je merkfundament aan om de uitkomst scherper te maken.
  </InfoBox>
);

export const Succes = () => (
  <InfoBox variant="success" title="Publicatie gelukt">
    De pagina staat live op je eigen domein en is opgenomen in de sitemap.
  </InfoBox>
);

export const Waarschuwing = () => (
  <InfoBox variant="warning" title="F-VAL onder de drempel">
    Deze tekst scoorde 68 van 100. Onder de 70 blokkeert de publicatiepoort.
  </InfoBox>
);

export const Fout = () => (
  <InfoBox variant="error" title="Generatie afgebroken" onDismiss={() => {}}>
    Het model gaf geen bruikbare JSON terug. Probeer opnieuw of kies een ander model.
  </InfoBox>
);

export const Formaten = () => (
  <div className="space-y-3">
    <InfoBox variant="info" size="sm">Compacte melding.</InfoBox>
    <InfoBox variant="info" size="lg">Ruime melding voor een prominente plek op de pagina.</InfoBox>
  </div>
);
