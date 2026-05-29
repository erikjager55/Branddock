// DTS Ede — UI primitives
// Buttons, Badges, ScoreChip, Card, SectionHeading, Icon (Lucide subset)

const { useState } = React;

// --- Lucide-style icon set (24px grid, 1.5 stroke, rounded caps) ---
const ICONS = {
  globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 1 0 20"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></>,
  trophy: <><path d="M6 9h12l-1 9a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z"/><path d="M6 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/><path d="M6 9H4M18 9h2"/></>,
  team: <><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
  menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  chevron: <polyline points="9 18 15 12 9 6"/>,
  search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6 12 13 2 6"/></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>,
};

function Icon({ name, size = 20, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

// --- Button ---
function Button({ variant = 'primary', children, icon, onClick, disabled, type = 'button', size = 'md', className = '' }) {
  const cls = `dts-btn dts-btn--${variant} dts-btn--${size}${disabled ? ' is-disabled' : ''} ${className}`;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      {icon ? <Icon name={icon} size={16} /> : null}
    </button>
  );
}

// --- Badge ---
function Badge({ variant = 'neutral', children }) {
  return <span className={`dts-badge dts-badge--${variant}`}>{children}</span>;
}

// --- ScoreChip: pill for match results ---
function ScoreChip({ home, away, played = true }) {
  return (
    <span className={`dts-score${played ? '' : ' is-pending'}`}>
      {played ? <>{home} <span className="dts-score-dash">—</span> {away}</> : <>— : —</>}
    </span>
  );
}

// --- Card ---
function Card({ children, className = '', as = 'article' }) {
  const Tag = as;
  return <Tag className={`dts-card ${className}`}>{children}</Tag>;
}

// --- SectionHeading: H2 with optional "Meer →" link ---
function SectionHeading({ children, link, linkText = 'Meer' }) {
  return (
    <header className="dts-section-head">
      <h2 className="dts-section-title">{children}</h2>
      {link ? (
        <a className="dts-section-link" href={link}>
          {linkText} <Icon name="arrow" size={16} />
        </a>
      ) : null}
    </header>
  );
}

Object.assign(window, { Icon, Button, Badge, ScoreChip, Card, SectionHeading });
