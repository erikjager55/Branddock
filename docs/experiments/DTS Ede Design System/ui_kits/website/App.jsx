// Top-level app — composes the page

function App() {
  return (
    <>
      <Header active="home" />
      <main>
        <Hero />
        <SponsorStrip />
        <section className="dts-section">
          <div className="dts-container dts-home-grid">
            <div className="dts-home-grid__main">
              <SectionHeading link="#" linkText="Alle berichten">Nieuws</SectionHeading>
              <div className="dts-news-grid">
                {NEWS.slice(0, 3).map((n, i) => <NewsCard key={i} item={n} />)}
              </div>
              <div className="dts-news-grid dts-news-grid--secondary">
                {NEWS.slice(3, 6).map((n, i) => <NewsCard key={i} item={n} />)}
              </div>
            </div>
            <Jarigen />
          </div>
        </section>
        <FixtureTable />
        <StandingsTable />
      </main>
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
