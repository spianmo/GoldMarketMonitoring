import { db } from '../db/dexie';
import { getRawSince, upsertMinute } from '../db/repos';
import type { PriceMinuteRow } from '../db/dexie';

export function minuteOf(ts: number): number {
  return Math.floor(ts / 60000);
}

let pendingMinute: PriceMinuteRow | null = null;

export async function feedPrice(ts: number, price: number) {
  const m = minuteOf(ts);
  if (!pendingMinute || pendingMinute.minute !== m) {
    if (pendingMinute) {
      await upsertMinute(pendingMinute);
    }
    pendingMinute = { minute: m, open: price, high: price, low: price, close: price, count: 1 };
  } else {
    pendingMinute.high = Math.max(pendingMinute.high, price);
    pendingMinute.low = Math.min(pendingMinute.low, price);
    pendingMinute.close = price;
    pendingMinute.count += 1;
  }
  await upsertMinute(pendingMinute);
}

export async function rebuildPendingFromRaw() {
  const now = Date.now();
  const m = minuteOf(now);
  const minuteStart = m * 60000;
  const rows = await getRawSince(minuteStart);
  if (rows.length === 0) {
    pendingMinute = null;
    return;
  }
  let high = -Infinity;
  let low = Infinity;
  for (const r of rows) {
    if (r.price > high) high = r.price;
    if (r.price < low) low = r.price;
  }
  pendingMinute = {
    minute: m,
    open: rows[0].price,
    high,
    low,
    close: rows[rows.length - 1].price,
    count: rows.length,
  };
}

export async function resetAggregator() {
  pendingMinute = null;
  await db.prices_minute.clear();
}
