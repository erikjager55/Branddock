// Compacte tweevlaks-kop voor binnenpagina's — effen inktpaneel met tekst +
// vol-mozaïek-paneel in de kleur-familie van de pagina. Vervangt de eerdere
// gradient-banner met een gemaskeerd mozaïek-hoekje (compositie-herziening H2).
// De familie geeft de bezoeker een oriëntatiepunt: product (blauw/mint),
// mensen (oranje/lime), bewijs (mint/lime).

import Mosaic, { MOSAIC_PRODUCT, MOSAIC_PEOPLE, MOSAIC_PROOF } from './Mosaic';

export type SplitHeaderFamily = 'product' | 'people' | 'proof';

const FAMILY_PALETTE: Record<SplitHeaderFamily, [string, string][]> = {
  product: MOSAIC_PRODUCT,
  people: MOSAIC_PEOPLE,
  proof: MOSAIC_PROOF,
};

const FAMILY_BG: Record<SplitHeaderFamily, string> = {
  product: 'var(--g-brand)',
  people: 'var(--g-warm)',
  proof: 'var(--g-fresh)',
};

interface SplitHeaderProps {
  id: string;
  family: SplitHeaderFamily;
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Toon het witte logo i.p.v. een eyebrow-label (About-pagina). */
  logo?: boolean;
  className?: string;
}

export default function SplitHeader({
  id,
  family,
  eyebrow,
  title,
  lead,
  logo,
  className,
}: SplitHeaderProps) {
  return (
    <div className={`mkt-split mkt-split--header${className ? ` ${className}` : ''}`}>
      <div className="mkt-split__ink">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- statische SVG-merkasset
          <img
            src="/marketing/branddock-logo-white.svg"
            alt="Branddock"
            className="h-6 w-auto mb-4"
          />
        ) : eyebrow ? (
          <div className="mkt-split__eyebrow">{eyebrow}</div>
        ) : null}
        <h1>{title}</h1>
        {lead ? <p className="mkt-split__lead">{lead}</p> : null}
      </div>
      <div className="mkt-split__mosaic" style={{ background: FAMILY_BG[family] }}>
        <Mosaic
          id={id}
          cols={5}
          rows={3}
          palette={FAMILY_PALETTE[family]}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.92 }}
        />
      </div>
    </div>
  );
}
