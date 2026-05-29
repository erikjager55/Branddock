// News cards — REAL headlines from dtsede.nl (May 2026)

const NEWS = [
  {
    tag: 'Wedstrijd',
    date: '17 mei 2026',
    competition: 'DTS Ede 1 · KNVB Zaterdag',
    title: 'Wedstrijd met twee gezichten',
    summary: 'DTS Ede blijft haar zegereeks voortzetten. Wie alleen de eerste helft heeft gezien, zal daar van opkijken. De Edenaren gingen dan ook meer dan terecht met een achterstand de rust in.',
    tone: 1,
  },
  {
    tag: 'Toernooi',
    date: '17 mei 2026',
    competition: 'International U15 Tournament',
    title: 'Maandag 25 mei International U15 Tournament DTS Ede',
    summary: 'DTS Ede organiseert dit toernooi voor de 23e keer. Het toernooi heeft zich ontwikkeld tot een van de zwaarste toernooien van Nederland gezien het aantal wedstrijden. Om 10.30 uur […]',
    tone: 2,
  },
  {
    tag: 'Wedstrijd',
    date: '9 mei 2026',
    competition: 'DTS Ede 1 · Derby',
    title: 'Solide overwinning DTS Ede',
    summary: 'DTS Ede heeft vanmiddag de derby in Veenendaal tegen VRC gewonnen. De winnende treffer werd al na 1 minuut en dertig seconden door Giorgio van Dommelen tegen de touwen geschoten.',
    tone: 3,
  },
  {
    tag: 'Trainer',
    date: '3 mei 2026',
    competition: 'DTS Ede Vrouwen 2',
    title: 'DTS Ede Vrouwen 2 heeft nieuwe hoofdtrainer binnen',
    summary: 'EDE – Marcel Bos (53) is met ingang van het seizoen 2026/27 de nieuwe hoofdtrainer van DTS Vrouwen 2. De Veenendaler vertrekt na twee seizoenen bij VRC Veenendaal Vrouwen 1.',
    tone: 1,
  },
  {
    tag: 'Wedstrijd',
    date: '27 apr 2026',
    competition: 'DTS Ede 1 · Thuis',
    title: 'Magere zege DTS Ede tegen degradant DOS Kampen',
    summary: 'DTS Ede heeft vanmiddag het thuisduel tegen DOS Kampen met 1-0 gewonnen. Frank Boers maakte het beslissende doelpunt in een wedstrijd waarin kansen aan beide kanten maar niet vielen.',
    tone: 2,
  },
  {
    tag: 'Jeugd',
    date: '27 apr 2026',
    competition: 'DTS Ede JO11-1',
    title: 'DTS Ede JO11-1 zoekt talent',
    summary: '2x kampioen Hoofdklasse (Hoog). Voor komend seizoen zoeken wij gemotiveerde en talentvolle spelers uit Ede en omgeving (geboortejaar 2015).',
    tone: 3,
  },
];

function NewsCard({ item }) {
  return (
    <Card>
      <div className={`dts-news__photo dts-news__photo--${item.tone}`} aria-hidden="true">
        <span className="dts-news__tag">{item.tag}</span>
        <span className="dts-news__placeholder">[ photo ]</span>
      </div>
      <div className="dts-news__body">
        <div className="dts-news__meta">
          {item.date} · {item.competition}
        </div>
        <h3 className="dts-news__title">{item.title}</h3>
        <p className="dts-news__summary">{item.summary}</p>
        <a className="dts-news__more" href="#">Lees verder <Icon name="arrow" size={14} /></a>
      </div>
    </Card>
  );
}

function NewsGrid() {
  return (
    <section className="dts-section">
      <div className="dts-container">
        <SectionHeading link="#" linkText="Alle berichten">Nieuws</SectionHeading>
        <div className="dts-news-grid">
          {NEWS.slice(0, 3).map((n, i) => <NewsCard key={i} item={n} />)}
        </div>
        <div className="dts-news-grid dts-news-grid--secondary">
          {NEWS.slice(3, 6).map((n, i) => <NewsCard key={i} item={n} />)}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { NewsCard, NewsGrid, NEWS });
