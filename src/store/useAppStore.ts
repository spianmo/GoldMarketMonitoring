import { create } from 'zustand';
import type {
  AppSettings,
  FetcherStatus,
  PriceTick,
  WatchItem,
} from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/types';

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
  setDailyStats: (s: {
    dayOpenPrice: number | null;
    todayHigh: number | null;
    todayLow: number | null;
    yesterdayClose: number | null;
  }) => void;
  setWatches: (list: WatchItem[]) => void;
  setChartWindow: (w: ChartWindow) => void;
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
      const startOfToday = (() => {
        const d = new Date(t.ts);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })();
      const isNewDay =
        state.currentTick == null || state.currentTick.ts < startOfToday;

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
  setDailyStats: (s) => set(s),
  setWatches: (list) => set({ watches: list }),
  setChartWindow: (w) => set({ chartWindow: w }),
}));
