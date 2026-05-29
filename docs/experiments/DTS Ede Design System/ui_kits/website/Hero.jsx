// Hero — copy tightened to match real club voice

function Hero() {
  return (
    <section className="dts-hero">
      <div className="dts-hero__photo" aria-hidden="true">
        <div className="dts-hero__placeholder">
          <span>[ authentic match action — Sportpark Peppelensteeg ]</span>
        </div>
        <div className="dts-hero__scrim"></div>
      </div>
      <div className="dts-hero__inner">
        <div className="dts-hero__eyebrow">WELKOM BIJ DTS '35 EDE</div>
        <h1 className="dts-hero__title">
          Samen voetballen,<br />samen groeien.
        </h1>
        <p className="dts-hero__lede">
          Sinds 1935 het blauw-witte hart van voetbal in Ede. Jeugd, senioren, dames en 35+ — bij onze club vind je een plek.
        </p>
        <div className="dts-hero__cta">
          <Button variant="primary" size="lg">Word lid</Button>
          <Button variant="secondary-light" size="lg" icon="arrow">Bekijk programma</Button>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
