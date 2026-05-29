// Deep Blue footer — real club info from dtsede.nl

function Footer() {
  const cols = [
    {
      heading: 'Onze club',
      links: ['Historie', 'Lidmaatschap', 'Contributie', 'Kleding', 'Accommodatie', 'Beleidsplan', 'Club van 100', 'Gedragsregels'],
    },
    {
      heading: 'Voetbal',
      links: ['Jeugd JO8–JO19', 'Senioren mannen', 'Vrouwen', '35+', 'Speelgroep & F-League', 'Trainingstijden'],
    },
    {
      heading: 'Wedstrijdzaken',
      links: ['Wedstrijdzaken app', 'Programma', 'Uitslagen', 'Afgelastingen', 'Boetes / KNVB Tuchtzaken'],
    },
    {
      heading: 'Vrijwilligers & contact',
      links: ['Vrijwilligersbeleid', 'Routebeschrijving', 'Overzicht personen', 'Vertrouwenspersonen', 'Sponsor worden'],
    },
  ];

  return (
    <footer className="dts-footer">
      <div className="dts-container dts-footer__inner">
        <div className="dts-footer__brand">
          <img src="../../assets/dts-ede-logo.png" alt="DTS '35 Ede" />
          <div className="dts-footer__brand-text">
            <div className="dts-footer__name">V.V. DTS '35 Ede</div>
            <div className="dts-footer__sub">Door Training Sterker · sinds 1935 · blauw-witte</div>
          </div>
        </div>

        <div className="dts-footer__cols">
          {cols.map((c) => (
            <div key={c.heading} className="dts-footer__col">
              <h4 className="dts-footer__heading">{c.heading}</h4>
              <ul>
                {c.links.map((l) => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="dts-footer__contact">
          <h4 className="dts-footer__heading">Sportpark Peppelensteeg</h4>
          <div className="dts-footer__row"><Icon name="pin" size={16} /> <span>Inschoterweg 2, 6715 CS Ede</span></div>
          <div className="dts-footer__row"><Icon name="phone" size={16} /> <span>0318 - 437 121</span></div>
          <div className="dts-footer__row"><Icon name="mail" size={16} /> <span>info@dtsede.nl</span></div>

          <div className="dts-footer__socials">
            <h4 className="dts-footer__heading">Volg ons</h4>
            <div className="dts-footer__social-row">
              <a href="https://www.facebook.com/vvDTSEde" target="_blank" rel="noopener">facebook.com/vvDTSEde</a>
              <a href="https://www.instagram.com/dtsede35/" target="_blank" rel="noopener">@dtsede35</a>
            </div>
          </div>
        </div>

        <div className="dts-footer__legal">
          <span>© V.V. DTS '35 Ede {new Date().getFullYear()} · Door Training Sterker · KvK 40117895</span>
          <span className="dts-footer__legal-links">
            <a href="#">Privacyverklaring</a> · <a href="#">Gedragsregels</a> · <a href="#">Materiaalbeleid</a> · <a href="https://www.knvb.nl" target="_blank" rel="noopener">KNVB</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

window.Footer = Footer;
