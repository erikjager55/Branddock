// Fixtures / Programma / Stand — tabbed section

const FIXTURES_RESULTS = [
  { date: 'Za 17 mei · 14:30', home: 'DTS Ede 1', away: 'Veensche Boys', score: { h: 3, a: 1 }, comp: '2e klasse', isHome: true },
  { date: 'Za 10 mei · 14:30', home: 'SDC Putten', away: 'DTS Ede 1', score: { h: 1, a: 2 }, comp: '2e klasse', isHome: false },
  { date: 'Za 3 mei · 14:30', home: 'DTS Ede 1', away: 'HSV Zuidvogels', score: { h: 2, a: 2 }, comp: '2e klasse', isHome: true },
  { date: 'Za 26 apr · 12:30', home: 'DTS Ede VR1', away: 'CSV Apeldoorn VR1', score: { h: 4, a: 0 }, comp: 'Vrouwen 3e klasse', isHome: true },
];

const FIXTURES_UPCOMING = [
  { date: 'Za 24 mei · 14:30', home: 'CSV Apeldoorn', away: 'DTS Ede 1', comp: '2e klasse', isHome: false },
  { date: 'Za 31 mei · 14:30', home: 'DTS Ede 1', away: 'Sparta Nijkerk', comp: '2e klasse', isHome: true },
  { date: 'Ma 1 jun · 09:00', home: 'DTS Ede U13', away: 'Intl. Top Tournament', comp: 'JO13 · Toernooi', isHome: true, tournament: true },
  { date: 'Za 7 jun · 14:30', home: 'Veensche Boys 2', away: 'DTS Ede 2', comp: 'Reserve 3e klasse', isHome: false },
];

function FixtureRow({ row, showScore }) {
  return (
    <tr>
      <td className="dts-fx__date">{row.date}</td>
      <td className={`dts-fx__team${row.isHome ? ' is-us' : ''}`}>{row.home}</td>
      <td className="dts-fx__score">
        {showScore && row.score
          ? <ScoreChip home={row.score.h} away={row.score.a} />
          : row.tournament
            ? <Badge variant="primary">Toernooi</Badge>
            : <ScoreChip played={false} />}
      </td>
      <td className={`dts-fx__team${!row.isHome ? ' is-us' : ''}`}>{row.away}</td>
      <td className="dts-fx__comp">{row.comp}</td>
    </tr>
  );
}

function FixtureTable() {
  const [tab, setTab] = React.useState('uitslagen');
  const rows = tab === 'uitslagen' ? FIXTURES_RESULTS : FIXTURES_UPCOMING;
  const showScore = tab === 'uitslagen';

  return (
    <section className="dts-section dts-section--alt">
      <div className="dts-container">
        <SectionHeading link="#" linkText="Volledige agenda">Wedstrijden</SectionHeading>
        <div className="dts-tabs" role="tablist">
          <button role="tab" className={`dts-tab${tab === 'uitslagen' ? ' is-active' : ''}`} onClick={() => setTab('uitslagen')}>Uitslagen</button>
          <button role="tab" className={`dts-tab${tab === 'programma' ? ' is-active' : ''}`} onClick={() => setTab('programma')}>Programma</button>
        </div>
        <div className="dts-table-wrap">
          <table className="dts-table dts-table--fixtures">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Thuis</th>
                <th></th>
                <th>Uit</th>
                <th>Competitie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => <FixtureRow key={i} row={r} showScore={showScore} />)}
            </tbody>
          </table>
        </div>
        <div className="dts-table-note">
          Afgelastingen worden uiterlijk twee uur voor aanvang gecommuniceerd via Wedstrijdzaken.
        </div>
      </div>
    </section>
  );
}

window.FixtureTable = FixtureTable;
