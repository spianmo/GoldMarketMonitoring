import { useEffect, useMemo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import type {
  FloaterBaseline,
  FloaterSize,
  PriceTick,
} from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';
import { bridge } from '../ipc/bridge';
import { formatPrice } from '../utils/parsePrice';
import MiniChart, { type MiniChartPoint } from './MiniChart';
import SizeSelector from './SizeSelector';

interface DerivedDelta {
  abs: number;
  pct: number;
  basis: 'dayOpen' | 'yesterdayClose' | 'session';
}

const HISTORY_LIMIT = 90;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DRAG_REGION = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

export default function FloaterApp() {
  const [tick, setTick] = useState<PriceTick | null>(null);
  const [baseline, setBaseline] = useState<FloaterBaseline>({
    dayOpen: null,
    yesterdayClose: null,
  });
  const [sessionOpen, setSessionOpen] = useState<number | null>(null);
  const [history, setHistory] = useState<MiniChartPoint[]>([]);
  const [size, setSize] = useState<FloaterSize>(DEFAULT_SETTINGS.floaterSize);

  useEffect(() => {
    const api = bridge();
    void api.floater.getBaseline().then(setBaseline);
    void api.settings.get().then((s) => setSize(s.floaterSize));

    const offTick = api.fetcher.onPriceUpdate((t) => {
      setTick(t);
      setSessionOpen((curr) => (curr == null ? t.price : curr));
      setHistory((prev) => {
        const next = [...prev, { ts: t.ts, price: t.price }];
        return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
      });
    });
    const offBaseline = api.floater.onBaseline((b) => setBaseline(b));

    let cancelled = false;
    const pollSize = setInterval(async () => {
      try {
        const s = await api.settings.get();
        if (!cancelled) setSize(s.floaterSize);
      } catch {
        // ignore
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(pollSize);
      offTick();
      offBaseline();
    };
  }, []);

  const derived: DerivedDelta | null = useMemo(() => {
    if (!tick) return null;
    if (baseline.dayOpen != null && baseline.dayOpen > 0) {
      const abs = tick.price - baseline.dayOpen;
      return { abs, pct: (abs / baseline.dayOpen) * 100, basis: 'dayOpen' };
    }
    if (baseline.yesterdayClose != null && baseline.yesterdayClose > 0) {
      const abs = tick.price - baseline.yesterdayClose;
      return { abs, pct: (abs / baseline.yesterdayClose) * 100, basis: 'yesterdayClose' };
    }
    if (sessionOpen != null && sessionOpen > 0) {
      const abs = tick.price - sessionOpen;
      return { abs, pct: (abs / sessionOpen) * 100, basis: 'session' };
    }
    return null;
  }, [tick, baseline, sessionOpen]);

  const isUp = derived ? derived.abs > 0 : false;
  const isDown = derived ? derived.abs < 0 : false;
  const deltaColor = isUp
    ? 'text-emerald-600'
    : isDown
    ? 'text-red-500'
    : 'text-ink-500';
  const basisLabel = !derived
    ? null
    : derived.basis === 'dayOpen'
    ? '日内'
    : derived.basis === 'yesterdayClose'
    ? '隔日'
    : '会话';

  const onChangeSize = (next: FloaterSize) => {
    setSize(next);
    void bridge().settings.set({ floaterSize: next });
  };

  return (
    <div className="group h-full w-full p-2 select-none" style={DRAG_REGION}>
      <div className="relative h-full w-full rounded-2xl border border-gold-200 bg-white/95 shadow-soft overflow-hidden">
        {size === 'small' && (
          <SmallLayout
            tick={tick}
            derived={derived}
            deltaColor={deltaColor}
            isUp={isUp}
            currentSize={size}
            onChangeSize={onChangeSize}
          />
        )}
        {size === 'medium' && (
          <MediumLayout
            tick={tick}
            derived={derived}
            deltaColor={deltaColor}
            isUp={isUp}
            basisLabel={basisLabel}
            currentSize={size}
            onChangeSize={onChangeSize}
          />
        )}
        {size === 'large' && (
          <LargeLayout
            tick={tick}
            derived={derived}
            deltaColor={deltaColor}
            isUp={isUp}
            basisLabel={basisLabel}
            history={history}
            currentSize={size}
            onChangeSize={onChangeSize}
          />
        )}
      </div>
    </div>
  );
}

interface ControlsProps {
  currentSize: FloaterSize;
  onChangeSize: (s: FloaterSize) => void;
}

function ControlsBar({ currentSize, onChangeSize }: ControlsProps) {
  return (
    <div
      className="flex items-center gap-1"
      style={NO_DRAG_REGION}
    >
      <SizeSelector current={currentSize} onChange={onChangeSize} />
      <button
        type="button"
        onClick={() => bridge().floater.openMain()}
        className="h-5 w-5 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-700 flex items-center justify-center"
        title="打开主窗口"
      >
        <Maximize2 size={11} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => bridge().floater.hide()}
        className="h-5 w-5 rounded-md hover:bg-red-100 text-ink-500 hover:text-red-500 flex items-center justify-center"
        title="关闭"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

interface SwappableHeaderProps extends ControlsProps {
  children: React.ReactNode;
}

function SwappableHeader({ currentSize, onChangeSize, children }: SwappableHeaderProps) {
  return (
    <div className="relative h-5">
      <div className="absolute inset-0 flex items-center transition-opacity opacity-100 group-hover:opacity-0 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-end transition-opacity opacity-0 group-hover:opacity-100">
        <ControlsBar currentSize={currentSize} onChangeSize={onChangeSize} />
      </div>
    </div>
  );
}

interface LayoutCommonProps {
  tick: PriceTick | null;
  derived: DerivedDelta | null;
  deltaColor: string;
  isUp: boolean;
  currentSize: FloaterSize;
  onChangeSize: (s: FloaterSize) => void;
}

interface MediumProps extends LayoutCommonProps {
  basisLabel: string | null;
}

interface LargeProps extends MediumProps {
  history: MiniChartPoint[];
}

function SmallLayout({ tick, derived, deltaColor, isUp, currentSize, onChangeSize }: LayoutCommonProps) {
  return (
    <div className="h-full w-full px-3 py-2 flex items-center gap-2.5">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-gold-400 to-gold-600 text-white text-[10px] font-medium shadow-sm shrink-0">
        ¥
      </span>
      <div className="flex flex-col leading-none min-w-0">
        <div className="text-[18px] font-semibold tracking-tight text-gold-700 font-mono">
          {tick ? formatPrice(tick.price) : '—.—'}
        </div>
        <div className={`text-[10px] font-mono font-medium mt-1 ${deltaColor}`}>
          {derived
            ? `${isUp ? '+' : ''}${derived.abs.toFixed(2)} ${isUp ? '+' : ''}${derived.pct.toFixed(2)}%`
            : '等待数据'}
        </div>
      </div>
      <div className="flex-1" />
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-lg px-1 py-0.5 shadow-sm"
      >
        <ControlsBar currentSize={currentSize} onChangeSize={onChangeSize} />
      </div>
    </div>
  );
}

function MediumLayout({
  tick,
  derived,
  deltaColor,
  isUp,
  basisLabel,
  currentSize,
  onChangeSize,
}: MediumProps) {
  return (
    <div className="h-full w-full px-3.5 pt-2.5 pb-3 flex flex-col">
      <SwappableHeader currentSize={currentSize} onChangeSize={onChangeSize}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-gold-400 to-gold-600 text-white text-[10px] font-medium shadow-sm shrink-0">
            ¥
          </span>
          <span className="text-[11px] text-ink-500 leading-none truncate">浙商金价</span>
          {basisLabel && (
            <span className="text-[10px] text-gold-700 bg-gold-100 px-1.5 py-0.5 rounded leading-none shrink-0">
              {basisLabel}
            </span>
          )}
        </div>
      </SwappableHeader>

      <div className="flex items-baseline gap-1.5 leading-none mt-2">
        <div className="text-[26px] font-semibold tracking-tight text-gold-700 font-mono">
          {tick ? formatPrice(tick.price) : '—.—'}
        </div>
        <div className="text-[10px] text-ink-500">元/克</div>
      </div>

      <div className="flex items-center justify-between text-[12px] leading-none mt-auto pt-2">
        <div className={`font-mono font-medium ${deltaColor}`}>
          {derived
            ? `${isUp ? '+' : ''}${derived.abs.toFixed(2)}  ${isUp ? '+' : ''}${derived.pct.toFixed(2)}%`
            : '等待数据'}
        </div>
        <div className="flex items-center gap-1.5 text-ink-500">
          {tick && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-ink-100 leading-none">
              {tick.source === 'http' ? 'HTTP' : 'WIN'}
            </span>
          )}
          <span className="text-[11px] font-mono">
            {tick ? formatTime(tick.ts) : '--:--:--'}
          </span>
        </div>
      </div>
    </div>
  );
}

function LargeLayout({
  tick,
  derived,
  deltaColor,
  isUp,
  basisLabel,
  history,
  currentSize,
  onChangeSize,
}: LargeProps) {
  const firstTs = history[0]?.ts;
  const lastTs = history[history.length - 1]?.ts;
  return (
    <div className="h-full w-full px-3.5 pt-2.5 pb-3 flex flex-col">
      <SwappableHeader currentSize={currentSize} onChangeSize={onChangeSize}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-gold-400 to-gold-600 text-white text-[10px] font-medium shadow-sm shrink-0">
            ¥
          </span>
          <span className="text-[11px] text-ink-500 leading-none truncate">浙商金价</span>
          {basisLabel && (
            <span className="text-[10px] text-gold-700 bg-gold-100 px-1.5 py-0.5 rounded leading-none shrink-0">
              {basisLabel}
            </span>
          )}
        </div>
      </SwappableHeader>

      <div className="flex items-end justify-between mt-2">
        <div className="flex items-baseline gap-1.5 leading-none">
          <div className="text-[24px] font-semibold tracking-tight text-gold-700 font-mono">
            {tick ? formatPrice(tick.price) : '—.—'}
          </div>
          <div className="text-[10px] text-ink-500">元/克</div>
        </div>
        <div className={`font-mono text-[12px] font-medium leading-none ${deltaColor}`}>
          {derived
            ? `${isUp ? '+' : ''}${derived.abs.toFixed(2)}  ${isUp ? '+' : ''}${derived.pct.toFixed(2)}%`
            : '— —'}
        </div>
      </div>

      <div className="flex-1 mt-2 min-h-[70px]">
        <MiniChart data={history} />
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink-400 mt-1.5 leading-none">
        <span>{firstTs ? formatTimeShort(firstTs) : '--:--'}</span>
        <span>近 {history.length} 个采样</span>
        <span>
          {tick && (
            <span className="px-1 py-0.5 mr-1.5 rounded bg-ink-100 text-ink-500 text-[9px]">
              {tick.source === 'http' ? 'HTTP' : 'WIN'}
            </span>
          )}
          {lastTs ? formatTimeShort(lastTs) : '--:--'}
        </span>
      </div>
    </div>
  );
}
