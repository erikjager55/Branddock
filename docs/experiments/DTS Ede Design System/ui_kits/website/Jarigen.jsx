// "Onze blauw-witte jarigen" — sidebar widget on the live homepage

const JARIGEN = [
  { date: '19 mei', name: 'Patrick van de Kolk' },
  { date: '20 mei', name: 'Cato Wieringa' },
  { date: '21 mei', name: 'Lars Bijl' },
  { date: '23 mei', name: 'Sven van Wijk' },
  { date: '25 mei', name: 'Joris ten Hove' },
];

const AGENDA = [
  { date: 'Za 24 mei', time: '14:30', label: 'DTS Ede 1 — CSV Apeldoorn (uit)' },
  { date: 'Ma 25 mei', time: '10:30', label: 'International U15 Tournament' },
  { date: 'Za 31 mei', time: '14:30', label: 'DTS Ede 1 — Sparta Nijkerk (thuis)' },
];

function Jarigen() {
  return (
    <aside className="dts-sidebar">
      <div className="dts-widget">
        <h6 className="dts-widget__heading">Agenda</h6>
        <ul className="dts-widget__list">
          {AGENDA.map((a, i) => (
            <li key={i}>
              <span className="dts-widget__date">{a.date} · {a.time}</span>
              <span className="dts-widget__label">{a.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="dts-widget">
        <h6 className="dts-widget__heading">Onze blauw-witte jarigen</h6>
        <table className="dts-jarigen">
          <tbody>
            {JARIGEN.map((j, i) => (
              <tr key={i}>
                <td className="dts-jarigen__date">{j.date}</td>
                <td className="dts-jarigen__name">{j.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dts-widget">
        <h6 className="dts-widget__heading">Zoek in deze site</h6>
        <div className="dts-search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Bijv. afgelastingen, JO13, contributie…" />
        </div>
      </div>

      <a href="#" className="dts-rookvrij" aria-label="Rookvrije generatie · Rookvrij sportpark">
        <span className="dts-rookvrij__mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="56" height="56">
            <circle cx="32" cy="32" r="30" fill="#0060A0" />
            <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" strokeWidth="3" />
            <line x1="14" y1="14" x2="50" y2="50" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
        <span className="dts-rookvrij__text">
          <strong>Rookvrije generatie</strong>
          <small>Rookvrij sportpark Peppelensteeg</small>
        </span>
      </a>
    </aside>
  );
}

window.Jarigen = Jarigen;
