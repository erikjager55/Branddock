// Sponsor strip — real sponsors from dtsede.nl

const SPONSORS = [
  { name: 'Autobedrijf Braber', href: 'https://www.autobraber.nl/' },
  { name: 'Sportted', href: '#' },
  { name: 'ING', href: 'https://www.ing.nl/' },
  { name: 'Aannemersbedrijf W. Maassen', href: 'https://www.aannemersbedrijfwmaassen.nl/' },
  { name: 'Sanidirect Ede', href: 'https://www.sanidirect.nl/winkels/ede' },
  { name: 'Concept4Cars', href: 'https://www.concept4cars.nl/' },
];

function SponsorStrip() {
  return (
    <section className="dts-sponsors">
      <div className="dts-container">
        <h4 className="dts-sponsors__heading">Onze blauw-witte sponsoren</h4>
        <div className="dts-sponsors__row">
          {SPONSORS.map((s) => (
            <a key={s.name} className="dts-sponsor" href={s.href} target="_blank" rel="noopener">
              <span className="dts-sponsor__logo">{s.name}</span>
            </a>
          ))}
          <a className="dts-sponsor dts-sponsor--club100" href="#">
            <span className="dts-sponsor__club100">
              <span className="dts-sponsor__club100-n">100</span>
              <span className="dts-sponsor__club100-t">Club van</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

window.SponsorStrip = SponsorStrip;
