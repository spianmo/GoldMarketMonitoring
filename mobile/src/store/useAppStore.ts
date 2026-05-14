import { create } from 'zustand';
import type {
  AppSettings,
  FetcherStatus,
  PriceTick,
  WatchItem,
} from '@goldmarket/shared';
import { DEFAULT_SETTINGS } from '@goldmarket/shared';

export type ChartWindow = '1m' | '5m' | '15m' | '1h' | '1d';

export const WINDOW_LABELS: Record<ChartWindow, string> = {
  '1m': '1分',
  '5m': '5分',
  '15m': '15分',
  '1h': '1时',
  '1d': '1日',
};

interface AppState {
  settings: AppSettings;
  status: FetcherStatus | null;
  currentTick: PriceTick | null;
  prevTick: PriceTick | null;
  dayOpenPrice: number | null;
  todayHigh: number | null;
  todayLow: number | null;
  yesterdayClose: number | null;
  watches: WatchItem[];
  chartWindow: ChartWindow;
  setSettings: (s: AppSettings) => void;
  setStatus: (s: FetcherStatus) => void;
  pushTick: (t: PriceTick) => void;
  setWatches: (list: WatchItem[]) => void;
  setChartWindow: (w: ChartWindow) => void;
  setYesterdayClose: (v: number | null) => void;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const useAppStore = create<AppState>((set) => ({
  settings: DEFAULT_SETTINGS,
  status: null,
  currentTick: null,
  prevTick: null,
  dayOpenPrice: null,
  todayHigh: null,
  todayLow: null,
  yesterdayClose: null,
  watches: [],
  chartWindow: '5m',
  setSettings: (s) => set({ settings: s }),
  setStatus: (s) => set({ status: s }),
  pushTick: (t) =>
    set((state) => {
      const todayStart = startOfDay(t.ts);
      const isNewDay = state.currentTick == null || state.currentTick.ts < todayStart;
      const high =
        isNewDay || state.todayHigh == null ? t.price : Math.max(state.todayHigh, t.price);
      const low =
        isNewDay || state.todayLow == null ? t.price : Math.min(state.todayLow, t.price);
      const open = isNewDay || state.dayOpenPrice == null ? t.price : state.dayOpenPrice;
      return {
        prevTick: state.currentTick,
        currentTick: t,
        dayOpenPrice: open,
        todayHigh: high,
        todayLow: low,
      };
    }),
  setWatches: (list) => set({ watches: list }),
  setChartWindow: (w) => set({ chartWindow: w }),
  setYesterdayClose: (v) => set({ yesterdayClose: v }),
}));
