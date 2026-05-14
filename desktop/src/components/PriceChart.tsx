import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore, WINDOW_LABELS, type ChartWindow } from '../store/useAppStore';
import { getMinutesSince, getRawSince } from '../db/repos';
import { formatPrice } from '@goldmarket/shared';

type Point = { t: number; v: number };

const WINDOW_MS: Record<ChartWindow, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

async function loadInitialData(win: ChartWindow): Promise<Point[]> {
  const now = Date.now();
  const since = now - WINDOW_MS[win];
  if (win === '1m' || win === '5m' || win === '15m') {
    const rows = await getRawSince(since);
    return rows.map((r) => ({ t: r.ts, v: r.price }));
  }
  const sinceMin = Math.floor(since / 60000);
  const rows = await getMinutesSince(sinceMin);
  return rows.map((r) => ({ t: r.minute * 60000, v: r.close }));
}

export default function PriceChart() {
  const window_ = useAppStore((s) => s.chartWindow);
  const setWindow = useAppStore((s) => s.setChartWindow);
  const currentTick = useAppStore((s) => s.currentTick);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 720, h: 320 });
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const initial = await loadInitialData(window_);
      if (!cancelled) setData(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, [window_]);

  useEffect(() => {
    if (!currentTick) return;
    setData((prev) => {
      const cutoff = Date.now() - WINDOW_MS[window_];
      const merged: Point[] = [...prev];
      const last = merged[merged.length - 1];
      const incoming: Point = { t: currentTick.ts, v: currentTick.price };
      if (window_ === '1m' || window_ === '5m' || window_ === '15m') {
        if (!last || incoming.t > last.t) merged.push(incoming);
      } else {
        const minuteOfIncoming = Math.floor(incoming.t / 60000) * 60000;
        if (!last || last.t !== minuteOfIncoming) {
          merged.push({ t: minuteOfIncoming, v: incoming.v });
        } else {
          merged[merged.length - 1] = { t: minuteOfIncoming, v: incoming.v };
        }
      }
      return merged.filter((p) => p.t >= cutoff);
    });
  }, [currentTick, window_]);

  const { pathD, areaD, scaleY, scaleX, ticks, yticks, lastPoint } = useMemo(() => {
    const margin = { top: 16, right: 60, bottom: 28, left: 8 };
    const innerW = Math.max(40, size.w - margin.left - margin.right);
    const innerH = Math.max(40, size.h - margin.top - margin.bottom);
    const now = Date.now();
    const xMin = now - WINDOW_MS[window_];
    const xMax = now;
    const x = d3.scaleTime().domain([xMin, xMax]).range([0, innerW]);

    const values = data.map((d) => d.v);
    let yMin = values.length ? Math.min(...values) : 0;
    let yMax = values.length ? Math.max(...values) : 1;
    if (yMin === yMax) {
      yMin -= 1;
      yMax += 1;
    }
    const padding = (yMax - yMin) * 0.15;
    yMin -= padding;
    yMax += padding;
    const y = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

    const lineGen = d3
      .line<Point>()
      .x((d) => x(d.t))
      .y((d) => y(d.v))
      .curve(d3.curveMonotoneX);
    const areaGen = d3
      .area<Point>()
      .x((d) => x(d.t))
      .y0(innerH)
      .y1((d) => y(d.v))
      .curve(d3.curveMonotoneX);

    return {
      pathD: lineGen(data) ?? '',
      areaD: areaGen(data) ?? '',
      scaleX: x,
      scaleY: y,
      ticks: x.ticks(window_ === '1d' ? 8 : 6),
      yticks: y.ticks(5),
      lastPoint: data.length ? data[data.length - 1] : null,
      margin,
      innerW,
      innerH,
    };
  }, [data, size, window_]);

  const margin = { top: 16, right: 60, bottom: 28, left: 8 };
  const innerW = Math.max(40, size.w - margin.left - margin.right);
  const innerH = Math.max(40, size.h - margin.top - margin.bottom);

  return (
    <div className="card-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-sm text-ink-700 font-medium">金价实时走势</div>
          <div className="flex items-center gap-1 text-xs">
            <span className="inline-block h-1.5 w-3 rounded-sm bg-gold-500" />
            <span className="text-ink-500">价格 (元/克)</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(WINDOW_LABELS) as ChartWindow[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={`tab-pill ${w === window_ ? 'active' : ''}`}
            >
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-[260px]">
        <svg ref={svgRef} width={size.w} height={size.h}>
          <defs>
            <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E0A82E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E0A82E" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left},${margin.top})`}>
            {yticks.map((t) => (
              <g key={t} transform={`translate(0,${scaleY(t)})`}>
                <line x1={0} x2={innerW} stroke="#F3F4F6" strokeDasharray="3 3" />
                <text
                  x={innerW + 6}
                  y={4}
                  fontSize={10}
                  fill="#9CA3AF"
                  textAnchor="start"
                  fontFamily="monospace"
                >
                  {formatPrice(t)}
                </text>
              </g>
            ))}

            {ticks.map((t, idx) => (
              <g key={idx} transform={`translate(${scaleX(t)},${innerH})`}>
                <text fontSize={10} fill="#9CA3AF" y={16} textAnchor="middle">
                  {d3.timeFormat(window_ === '1d' ? '%H时' : '%H:%M')(t)}
                </text>
              </g>
            ))}

            {data.length > 0 && (
              <>
                <path d={areaD} fill="url(#goldArea)" />
                <path d={pathD} fill="none" stroke="#E0A82E" strokeWidth={1.8} />
              </>
            )}

            {lastPoint && (
              <>
                <line
                  x1={0}
                  x2={innerW}
                  y1={scaleY(lastPoint.v)}
                  y2={scaleY(lastPoint.v)}
                  stroke="#22C55E"
                  strokeDasharray="4 3"
                  opacity={0.6}
                />
                <circle
                  cx={scaleX(lastPoint.t)}
                  cy={scaleY(lastPoint.v)}
                  r={4}
                  fill="#22C55E"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <rect
                  x={innerW - 70}
                  y={scaleY(lastPoint.v) - 10}
                  width={68}
                  height={20}
                  rx={4}
                  fill="#22C55E"
                  opacity={0.95}
                />
                <text
                  x={innerW - 36}
                  y={scaleY(lastPoint.v) + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#fff"
                  fontFamily="monospace"
                >
                  {formatPrice(lastPoint.v)}
                </text>
              </>
            )}
          </g>
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-500 mt-1">
        <div>数据来源: 浙商银行 公开行情</div>
        <div>窗口: {WINDOW_LABELS[window_]} · 已显示 {data.length} 个点</div>
      </div>
    </div>
  );
}
