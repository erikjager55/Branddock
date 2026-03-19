'use client';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function SparklineChart({
  data,
  width = 120,
  height = 32,
  color = '#10b981',
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Area fill path
  const firstX = padding;
  const lastX = padding + chartWidth;
  const areaPath = `M ${points[0]} ${points.slice(1).map((p) => `L ${p}`).join(' ')} L ${lastX},${height - padding} L ${firstX},${height - padding} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkline-fill)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={padding + chartWidth}
          cy={padding + chartHeight - ((data[data.length - 1] - min) / range) * chartHeight}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}
