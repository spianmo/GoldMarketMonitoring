import { useEffect, useRef, useState, type ReactElement } from 'react';

export interface MiniChartPoint {
  ts: number;
  price: number;
}

interface Props {
  data: MiniChartPoint[];
  color?: string;
  showLastDot?: boolean;
}

export default function MiniChart({ data, color = '#E0A82E', showLastDot = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  let svg: ReactElement | null = null;
  if (w > 4 && h > 4 && data.length >= 2) {
    const prices = data.map((d) => d.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const span = hi - lo || 1;
    const pad = span * 0.18;
    const yMin = lo - pad;
    const yRange = span + pad * 2;
    const n = data.length;

    const xs = data.map((_, i) => (i / (n - 1)) * w);
    const ys = data.map((d) => h - ((d.price - yMin) / yRange) * h);

    let lineD = `M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`;
    for (let i = 1; i < n; i++) {
      const px = xs[i - 1];
      const py = ys[i - 1];
      const x = xs[i];
      const y = ys[i];
      const cpx = (px + x) / 2;
      lineD += ` Q${cpx.toFixed(2)},${py.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
    }
    const areaD = `${lineD} L${xs[n - 1].toFixed(2)},${h} L${xs[0].toFixed(2)},${h} Z`;

    svg = (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="floater-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#floater-area)" />
        <path
          d={lineD}
          stroke={color}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showLastDot && (
          <circle
            cx={xs[n - 1]}
            cy={ys[n - 1]}
            r={2.4}
            fill={color}
            stroke="#fff"
            strokeWidth={1}
          />
        )}
      </svg>
    );
  }

  return (
    <div ref={ref} className="w-full h-full">
      {svg}
    </div>
  );
}
