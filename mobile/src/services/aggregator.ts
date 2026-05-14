import { upsertMinute, type MinuteRow } from './storage';

let pending: MinuteRow | null = null;

export function minuteOf(ts: number): number {
  return Math.floor(ts / 60000);
}

export function feedPrice(ts: number, price: number): void {
  const m = minuteOf(ts);
  if (!pending || pending.minute !== m) {
    if (pending) upsertMinute(pending);
    pending = { minute: m, open: price, high: price, low: price, close: price, count: 1 };
  } else {
    pending.high = Math.max(pending.high, price);
    pending.low = Math.min(pending.low, price);
    pending.close = price;
    pending.count += 1;
  }
  upsertMinute(pending);
}

export function resetAggregator(): void {
  pending = null;
}
