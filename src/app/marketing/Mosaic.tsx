// Geometrisch merk-mozaïek (brandbook v3) als SSR-veilige SVG.
// Deterministisch (hash van celpositie) → identieke server/client-render,
// geen Canvas, geen hydration-mismatch. Puur decoratief (aria-hidden).
//
// Elke instance heeft een unieke `id` nodig (gradient-ids zijn document-globaal).

interface MosaicProps {
  id: string;
  cols?: number;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
  /** 0–1; basis-tint achter de vormen */
  tint?: number;
  /** Subset gradient-paren; overschrijft de standaard 6. Voor de kleur-familie-regel. */
  palette?: [string, string][];
}

// Merkgradient-paren uit het brandbook.
const GRADS: [string, string][] = [
  ['#343CED', '#FECFBD'], // blue → peach
  ['#FF7F4D', '#D8FD48'], // orange → lime
  ['#343CED', '#07E5AB'], // blue → mint
  ['#07E5AB', '#D8FD48'], // mint → lime
  ['#FECFBD', '#FF7F4D'], // peach → orange
  ['#5B6BEF', '#07E5AB'], // indigo → mint
];

// Kleur-familie-paletten (website-compositie-herziening H2): geeft elke
// pagina-familie een herkenbare mozaïek-kleursfeer i.p.v. de willekeurige
// volle set. Product = blauw/mint, Mensen = oranje/lime, Bewijs = mint/lime.
export const MOSAIC_PRODUCT: [string, string][] = [
  ['#343CED', '#07E5AB'],
  ['#5B6BEF', '#07E5AB'],
  ['#343CED', '#FECFBD'],
];
export const MOSAIC_PEOPLE: [string, string][] = [
  ['#FF7F4D', '#D8FD48'],
  ['#FECFBD', '#FF7F4D'],
];
export const MOSAIC_PROOF: [string, string][] = [
  ['#07E5AB', '#D8FD48'],
  ['#343CED', '#07E5AB'],
];

const U = 100;

function hash(r: number, c: number): number {
  const h = (r * 73856093) ^ (c * 19349663);
  return Math.abs(h);
}

function shapePath(kind: number, gx: number, gy: number): string {
  const cx = gx + U / 2;
  const cy = gy + U / 2;
  switch (kind) {
    case 1: // kwartcirkel (linksboven-hoek)
      return `M ${gx} ${gy} L ${gx + U} ${gy} A ${U} ${U} 0 0 1 ${gx} ${gy + U} Z`;
    case 3: // ruit
      return `M ${cx} ${gy} L ${gx + U} ${cy} L ${cx} ${gy + U} L ${gx} ${cy} Z`;
    case 4: // 4-punts ster / sparkle
      return `M ${cx} ${gy} Q ${cx} ${cy} ${gx + U} ${cy} Q ${cx} ${cy} ${cx} ${gy + U} Q ${cx} ${cy} ${gx} ${cy} Q ${cx} ${cy} ${cx} ${gy} Z`;
    case 5: // halve cirkel (bovenkant)
      return `M ${gx} ${cy} A ${U / 2} ${U / 2} 0 0 1 ${gx + U} ${cy} Z`;
    default:
      return '';
  }
}

export default function Mosaic({
  id,
  cols = 8,
  rows = 3,
  className,
  style,
  tint = 0.14,
  palette,
}: MosaicProps) {
  const grads = palette && palette.length > 0 ? palette : GRADS;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = hash(r, c);
      const gi = h % grads.length;
      const kind = (h >> 3) % 7;
      const rot = (h >> 6) % 4;
      const gx = c * U;
      const gy = r * U;
      const cx = gx + U / 2;
      const cy = gy + U / 2;
      const fill = `url(#${id}-g${gi})`;

      let shape: React.ReactNode;
      if (kind === 0) {
        shape = <circle cx={cx} cy={cy} r={U / 2} fill={fill} />;
      } else if (kind === 2) {
        shape = <circle cx={cx} cy={cy} r={U * 0.32} fill="none" stroke={fill} strokeWidth={U * 0.16} />;
      } else if (kind === 6) {
        shape = <rect x={gx + U * 0.2} y={gy + U * 0.2} width={U * 0.6} height={U * 0.6} fill={fill} />;
      } else {
        shape = <path d={shapePath(kind, gx, gy)} fill={fill} />;
      }

      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={gx} y={gy} width={U} height={U} fill={fill} opacity={tint} />
          <g transform={`rotate(${rot * 90} ${cx} ${cy})`}>{shape}</g>
        </g>,
      );
    }
  }

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${cols * U} ${rows * U}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {grads.map(([a, b], i) => (
          <linearGradient key={i} id={`${id}-g${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        ))}
      </defs>
      {cells}
    </svg>
  );
}
