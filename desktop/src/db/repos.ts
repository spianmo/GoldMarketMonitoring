import type { AlertRecord, WatchItem } from '@goldmarket/shared';
import { db, RAW_RETENTION_MS, type PriceMinuteRow, type PriceRawRow } from './dexie';

export async function insertRawPrice(row: Omit<PriceRawRow, 'id'>): Promise<number> {
  const id = await db.prices_raw.add(row);
  return id as number;
}

export async function pruneOldRaw(now = Date.now()): Promise<number> {
  const cutoff = now - RAW_RETENTION_MS;
  return db.prices_raw.where('ts').below(cutoff).delete();
}

export async function getRawSince(sinceTs: number): Promise<PriceRawRow[]> {
  return db.prices_raw.where('ts').aboveOrEqual(sinceTs).sortBy('ts');
}

export async function getRecentRaw(limit = 600): Promise<PriceRawRow[]> {
  const rows = await db.prices_raw.orderBy('ts').reverse().limit(limit).toArray();
  return rows.reverse();
}

export async function upsertMinute(row: PriceMinuteRow) {
  await db.prices_minute.put(row);
}

export async function getMinutesSince(sinceMinute: number): Promise<PriceMinuteRow[]> {
  return db.prices_minute.where('minute').aboveOrEqual(sinceMinute).sortBy('minute');
}

export async function getEarliestMinuteOfDay(dayStartTs: number): Promise<PriceMinuteRow | undefined> {
  const startMin = Math.floor(dayStartTs / 60000);
  return db.prices_minute.where('minute').aboveOrEqual(startMin).first();
}

export async function getMinutesOfDay(dayStartTs: number): Promise<PriceMinuteRow[]> {
  const startMin = Math.floor(dayStartTs / 60000);
  const endMin = startMin + 24 * 60;
  return db.prices_minute
    .where('minute')
    .between(startMin, endMin, true, false)
    .sortBy('minute');
}

export async function listWatches(): Promise<WatchItem[]> {
  return db.watches.orderBy('createdAt').reverse().toArray();
}

export async function getWatch(id: number) {
  return db.watches.get(id);
}

export async function createWatch(item: Omit<WatchItem, 'id'>): Promise<number> {
  const id = await db.watches.add(item);
  return id as number;
}

export async function updateWatch(id: number, patch: Partial<WatchItem>) {
  await db.watches.update(id, patch);
}

export async function deleteWatch(id: number) {
  await db.watches.delete(id);
}

export async function listAlerts(limit = 200): Promise<AlertRecord[]> {
  return db.alerts.orderBy('ts').reverse().limit(limit).toArray();
}

export async function insertAlert(row: Omit<AlertRecord, 'id'>) {
  return db.alerts.add(row);
}
