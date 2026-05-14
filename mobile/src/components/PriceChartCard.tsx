import { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { useAppStore, WINDOW_LABELS, type ChartWindow } from '@/store/useAppStore';
import { colors } from '@/theme/colors';
import { getRawSince, listMinutesSince } from '@/services/storage';

const WINDOW_MS: Record<ChartWindow, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

interface Point {
  t: number;
  v: number;
}

function loadInitial(win: ChartWindow): Point[] {
  const now = Date.now();
  const since = now - WINDOW_MS[win];
  if (win === '1m' || win === '5m' || win === '15m') {
    return getRawSince(since).map((r) => ({ t: r.ts, v: r.price }));
  }
  const sinceMin = Math.floor(since / 60000);
  return listMinutesSince(sinceMin).map((r) => ({ t: r.minute * 60000, v: r.close }));
}

export default function PriceChartCard() {
  const window_ = useAppStore((s) => s.chartWindow);
  const setWindow = useAppStore((s) => s.setChartWindow);
  const tick = useAppStore((s) => s.currentTick);

  const [size, setSize] = useState({ w: 0, h: 200 });
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    setData(loadInitial(window_));
  }, [window_]);

  useEffect(() => {
    if (!tick) return;
    setData((prev) => {
      const cutoff = Date.now() - WINDOW_MS[window_];
      const merged = [...prev];
      const last = merged[merged.length - 1];
      if (window_ === '1m' || window_ === '5m' || window_ === '15m') {
        if (!last || tick.ts > last.t) merged.push({ t: tick.ts, v: tick.price });
      } else {
        const minuteOf = Math.floor(tick.ts / 60000) * 60000;
        if (!last || last.t !== minuteOf) {
          merged.push({ t: minuteOf, v: tick.price });
        } else {
          merged[merged.length - 1] = { t: minuteOf, v: tick.price };
        }
      }
      return merged.filter((p) => p.t >= cutoff);
    });
  }, [tick, window_]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setSize((s) => ({ ...s, w: Math.floor(width) }));
  };

  const chart = useMemo(() => {
    const margin = { top: 12, right: 56, bottom: 26, left: 64 };
    const innerW = Math.max(20, size.w - margin.left - margin.right);
    const innerH = Math.max(40, size.h - margin.top - margin.bottom);
    const now = Date.now();
    const xMin = now - WINDOW_MS[window_];
    const xMax = now;
    const x = scaleLinear().domain([xMin, xMax]).range([0, innerW]);

    const values = data.map((d) => d.v);
    let lo = values.length ? Math.min(...values) : 0;
    let hi = values.length ? Math.max(...values) : 1;
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.18;
    lo -= pad;
    hi += pad;
    const y = scaleLinear().domain([lo, hi]).range([innerH, 0]);

    const lineGen = line<Point>().x((d) => x(d.t)).y((d) => y(d.v)).curve(curveMonotoneX);
    const areaGen = area<Point>().x((d) => x(d.t)).y0(innerH).y1((d) => y(d.v)).curve(curveMonotoneX);

    const pathD = data.length >= 2 ? lineGen(data) ?? '' : '';
    const areaD = data.length >= 2 ? areaGen(data) ?? '' : '';

    const yTicks = y.ticks(5);
    const xTicks = x.ticks(window_ === '1d' ? 6 : 5);

    const fmtTime = (t: number) => {
      const d = new Date(t);
      if (window_ === '1d') return `${String(d.getHours()).padStart(2, '0')}时`;
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const last = data.length ? data[data.length - 1] : null;

    return {
      margin,
      innerW,
      innerH,
      x,
      y,
      pathD,
      areaD,
      yTicks,
      xTicks,
      fmtTime,
      last,
      lo,
      hi,
    };
  }, [data, size, window_]);

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        paddingBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink900 }}>金价走势</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {(Object.keys(WINDOW_LABELS) as ChartWindow[]).map((w) => {
            const active = w === window_;
            return (
              <TouchableOpacity
                key={w}
                onPress={() => setWindow(w)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: active ? colors.gold100 : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? colors.gold500 : colors.ink100,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: active ? '600' : '400',
                    color: active ? colors.gold700 : colors.ink500,
                  }}
                >
                  {WINDOW_LABELS[w]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View onLayout={onLayout} style={{ height: size.h, marginTop: 10 }}>
        {size.w > 0 && (
          <Svg width={size.w} height={size.h}>
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.gold500} stopOpacity={0.32} />
                <Stop offset="100%" stopColor={colors.gold500} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Svg x={chart.margin.left} y={chart.margin.top} width={chart.innerW} height={chart.innerH}>
              {chart.yTicks.map((t, i) => (
                <Line
                  key={`y-${i}`}
                  x1={0}
                  x2={chart.innerW}
                  y1={chart.y(t)}
                  y2={chart.y(t)}
                  stroke="#F3F4F6"
                  strokeDasharray="3 3"
                />
              ))}
              {chart.areaD && <Path d={chart.areaD} fill="url(#grad)" />}
              {chart.pathD && <Path d={chart.pathD} stroke={colors.gold500} strokeWidth={1.5} fill="none" />}
              {chart.last && (
                <>
                  <Line
                    x1={0}
                    x2={chart.innerW}
                    y1={chart.y(chart.last.v)}
                    y2={chart.y(chart.last.v)}
                    stroke={colors.green}
                    strokeDasharray="4 3"
                    opacity={0.6}
                  />
                  <Circle cx={chart.x(chart.last.t)} cy={chart.y(chart.last.v)} r={4} fill={colors.green} stroke="#fff" strokeWidth={1.5} />
                  <Rect x={chart.innerW - 56} y={chart.y(chart.last.v) - 10} width={56} height={20} rx={4} fill={colors.green} opacity={0.95} />
                  <SvgText
                    x={chart.innerW - 28}
                    y={chart.y(chart.last.v) + 4}
                    fill="#fff"
                    fontSize={11}
                    textAnchor="middle"
                  >
                    {chart.last.v.toFixed(2)}
                  </SvgText>
                </>
              )}
            </Svg>
            {chart.yTicks.map((t, i) => (
              <SvgText
                key={`yt-${i}`}
                x={chart.margin.left - 6}
                y={chart.margin.top + chart.y(t) + 4}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="end"
              >
                {t.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </SvgText>
            ))}
            {chart.xTicks.map((t, i) => (
              <SvgText
                key={`xt-${i}`}
                x={chart.margin.left + chart.x(t)}
                y={chart.margin.top + chart.innerH + 16}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {chart.fmtTime(t)}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, color: colors.ink500 }}>数据来源:浙商银行公开行情</Text>
        <Text style={{ fontSize: 11, color: colors.ink500 }}>共 {data.length} 个采样</Text>
      </View>
    </View>
  );
}
