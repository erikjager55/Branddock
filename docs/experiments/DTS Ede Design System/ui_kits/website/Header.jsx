// Sticky white header — real navigation from dtsede.nl (May 2026)
// 7 top-level sections, with mega-menu hint via chevron + dropdown previews.

function Header({ active = 'home' }) {
  const [openMenu, setOpenMenu] = React.useState(null);

  const nav = [
    { id: 'home', label: 'Home', href: '#' },
    { id: 'club', label: 'Onze club', children: ['Historie', 'Lidmaatschap', 'Kleding', 'Accommodatie', 'Beleidsplan', 'Club van 100', 'Gedragsregels'] },
    { id: 'jeugd', label: 'Jeugd', children: ['O19 / O17 / O16', 'O15 / O14', 'O13 / O12', 'O11 / O10', 'O9 / O8', 'Speelgroep & F-League', 'Trainingstijden', 'Coördinatoren'] },
    { id: 'senioren', label: 'Senioren', children: ['Mannen (1 t/m 9 + 35+)', 'Vrouwen (VR1–VR3, MO20-1)', 'O23-1'] },
    { id: 'wedstrijdzaken', label: 'Wedstrijdzaken', children: ['Wedstrijdzaken app', 'Programma', 'Uitslagen', 'Afgelastingen', 'Boetes / KNVB Tuchtzaken'] },
    { id: 'vrijwilligers', label: 'Vrijwilligersbeleid', href: '#' },
    { id: 'contact', label: 'Contact', children: ['Routebeschrijving', 'Overzicht personen', 'Vertrouwenspersonen'] },
  ];

  return (
    <header className="dts-header" onMouseLeave={() => setOpenMenu(null)}>
      <div className="dts-header__top">
        <div className="dts-header__top-inner">
          <span>Sportpark Peppelensteeg · Inschoterweg 2, Ede</span>
          <div className="dts-header__top-links">
            <a href="https://clubs.stanno.com/nl/dts-35/clubcollectie" target="_blank" rel="noopener">Ledenshop</a>
            <span>·</span>
            <a href="#">Sport BSO</a>
            <span>·</span>
            <a href="#" aria-label="Login">Login</a>
          </div>
        </div>
      </div>
      <div className="dts-header__inner">
        <a className="dts-brand" href="#">
          <img src="../../assets/dts-ede-logo.png" alt="DTS '35 Ede" />
          <span className="dts-brand__text">
            <span className="dts-brand__name">V.V. DTS '35 Ede</span>
            <span className="dts-brand__sub">Door Training Sterker · sinds 1935</span>
          </span>
        </a>
        <nav className="dts-nav" aria-label="Hoofdnavigatie">
          {nav.map((n) => (
            <div
              key={n.id}
              className="dts-nav__item"
              onMouseEnter={() => setOpenMenu(n.children ? n.id : null)}
            >
              <a
                href={n.href || `#${n.id}`}
                className={`dts-nav__link${n.id === active ? ' is-active' : ''}`}
              >
                {n.label}
                {n.children ? <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)', marginLeft: 2 }} /> : null}
              </a>
              {n.children && openMenu === n.id ? (
                <div className="dts-nav__menu">
                  {n.children.map((c) => (
                    <a key={c} href="#" className="dts-nav__menu-link">{c}</a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="dts-header__cta">
          <button className="dts-icon-btn" aria-label="Zoeken">
            <Icon name="search" size={20} />
          </button>
          <Button variant="primary" size="sm">Word lid</Button>
        </div>
      </div>
    </header>
  );
}

window.Header = Header;
