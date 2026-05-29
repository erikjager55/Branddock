// Standings table — KNVB 2e klasse

const STANDINGS = [
  { pos: 1, team: 'SDC Putten',       gp: 22, w: 16, d: 4, l: 2, gf: 54, ga: 18, pts: 52 },
  { pos: 2, team: 'DTS Ede',          gp: 22, w: 14, d: 5, l: 3, gf: 48, ga: 22, pts: 47, us: true },
  { pos: 3, team: 'Veensche Boys',    gp: 22, w: 12, d: 5, l: 5, gf: 41, ga: 28, pts: 41 },
  { pos: 4, team: 'CSV Apeldoorn',    gp: 22, w: 11, d: 4, l: 7, gf: 37, ga: 30, pts: 37 },
  { pos: 5, team: 'HSV Zuidvogels',   gp: 22, w: 10, d: 5, l: 7, gf: 35, ga: 29, pts: 35 },
  { pos: 6, team: 'Sparta Nijkerk',   gp: 22, w: 9,  d: 6, l: 7, gf: 33, ga: 31, pts: 33 },
  { pos: 7, team: 'VVOG Harderwijk',  gp: 22, w: 8,  d: 5, l: 9, gf: 30, ga: 34, pts: 29 },
  { pos: 8, team: 'GVVV Veenendaal',  gp: 22, w: 7,  d: 4, l:11, gf: 26, ga: 38, pts: 25 },
];

function StandingsTable() {
  return (
    <section className="dts-section">
      <div className="dts-container">
        <SectionHeading link="#" linkText="Volledige stand">Stand · KNVB 2e klasse</SectionHeading>
        <div className="dts-table-wrap">
          <table className="dts-table dts-table--standings">
            <thead>
              <tr>
                <th className="dts-pos">#</th>
                <th>Club</th>
                <th>GS</th>
                <th>W</th>
                <th>G</th>
                <th>V</th>
                <th>DV</th>
                <th>DT</th>
                <th className="dts-pts">PT</th>
              </tr>
            </thead>
            <tbody>
              {STANDINGS.map((s) => (
                <tr key={s.pos} className={s.us ? 'is-us' : ''}>
                  <td className="dts-pos">{s.pos}</td>
                  <td className="dts-fx__team">{s.team}{s.us ? <span className="dts-us-mark"> · ons</span> : null}</td>
                  <td>{s.gp}</td>
                  <td>{s.w}</td>
                  <td>{s.d}</td>
                  <td>{s.l}</td>
                  <td>{s.gf}</td>
                  <td>{s.ga}</td>
                  <td className="dts-pts">{s.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

window.StandingsTable = StandingsTable;
