import { getEarliestMinuteOfDay, getMinutesOfDay, getRecentRaw } from '../db/repos';
import { startOfDay } from '../utils/parsePrice';
import { useAppStore } from '../store/useAppStore';

export async function hydrateDailyStats(now = Date.now()) {
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 24 * 3600 * 1000;

  const [todayMinutes, yesterdayMinutes, recent] = await Promise.all([
    getMinutesOfDay(todayStart),
    getMinutesOfDay(yesterdayStart),
    getRecentRaw(60),
  ]);

  let dayOpen: number | null = null;
  let todayHigh: number | null = null;
  let todayLow: number | null = null;
  if (todayMinutes.length) {
    dayOpen = todayMinutes[0].open;
    todayHigh = Math.max(...todayMinutes.map((m) => m.high));
    todayLow = Math.min(...todayMinutes.map((m) => m.low));
  } else {
    const earliest = await getEarliestMinuteOfDay(todayStart);
    if (earliest) {
      dayOpen = earliest.open;
      todayHigh = earliest.high;
      todayLow = earliest.low;
    }
  }

  const yesterdayClose = yesterdayMinutes.length
    ? yesterdayMinutes[yesterdayMinutes.length - 1].close
    : null;

  useAppStore.getState().setDailyStats({
    dayOpenPrice: dayOpen,
    todayHigh,
    todayLow,
    yesterdayClose,
  });

  if (recent.length) {
    const last = recent[recent.length - 1];
    const prev = recent.length >= 2 ? recent[recent.length - 2] : null;
    useAppStore.setState({
      currentTick: { ts: last.ts, price: last.price, source: last.source },
      prevTick: prev ? { ts: prev.ts, price: prev.price, source: prev.source } : null,
    });
  }
}
