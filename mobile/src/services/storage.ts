import { MMKV } from 'react-native-mmkv';
import type { AlertRecord, AppSettings, WatchItem } from '@goldmarket/shared';
import { DEFAULT_SETTINGS } from '@goldmarket/shared';

const mmkv = new MMKV({ id: 'goldmarket' });

const K = {
  SETTINGS: 'settings',
  WATCHES: 'watches',
  ALERTS: 'alerts',
  MINUTES: 'prices_minute',
  RAW: 'prices_raw',
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const s = mmkv.getString(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  mmkv.set(key, JSON.stringify(value));
}

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(K.SETTINGS, {}) };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next: AppSettings = { ...getSettings(), ...patch };
  if (typeof next.intervalMs !== 'number' || next.intervalMs < 1000) next.intervalMs = 1000;
  writeJson(K.SETTINGS, next);
  return next;
}

// Watches
let nextWatchId = 1;
function ensureWatchId(): number {
  if (nextWatchId === 1) {
    const list = listWatches();
    nextWatchId = list.reduce((m, w) => Math.max(m, w.id ?? 0), 0) + 1;
  }
  return nextWatchId++;
}

export function listWatches(): WatchItem[] {
  return readJson<WatchItem[]>(K.WATCHES, []);
}

export function createWatch(item: Omit<WatchItem, 'id'>): WatchItem {
  const list = listWatches();
  const id = ensureWatchId();
  const created: WatchItem = { ...item, id };
  list.unshift(created);
  writeJson(K.WATCHES, list);
  return created;
}

export function updateWatch(id: number, patch: Partial<WatchItem>): WatchItem | null {
  const list = listWatches();
  const idx = list.findIndex((w) => w.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch };
  writeJson(K.WATCHES, list);
  return list[idx];
}

export function deleteWatch(id: number): void {
  const list = listWatches().filter((w) => w.id !== id);
  writeJson(K.WATCHES, list);
}

// Alerts
export function listAlerts(limit = 200): AlertRecord[] {
  return readJson<AlertRecord[]>(K.ALERTS, []).slice(0, limit);
}

export function insertAlert(record: Omit<AlertRecord, 'id'>): AlertRecord {
  const list = readJson<AlertRecord[]>(K.ALERTS, []);
  const id = (list[0]?.id ?? 0) + 1;
  const created: AlertRecord = { ...record, id };
  list.unshift(created);
  writeJson(K.ALERTS, list.slice(0, 500));
  return created;
}

// Minute aggregation (OHLC)
export interface MinuteRow {
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
  count: number;
}

export function listMinutesSince(sinceMinute: number): MinuteRow[] {
  return readJson<MinuteRow[]>(K.MINUTES, [])
    .filter((r) => r.minute >= sinceMinute)
    .sort((a, b) => a.minute - b.minute);
}

export function upsertMinute(row: MinuteRow): void {
  const list = readJson<MinuteRow[]>(K.MINUTES, []);
  const idx = list.findIndex((r) => r.minute === row.minute);
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  // 长期保留最近 14400 分钟(10 天),防止 KV 膨胀
  const cutoff = Math.floor(Date.now() / 60000) - 14400;
  const pruned = list.filter((r) => r.minute >= cutoff).sort((a, b) => a.minute - b.minute);
  writeJson(K.MINUTES, pruned);
}

// Lightweight in-memory raw buffer (not persisted to MMKV)
const rawBuffer: { ts: number; price: number }[] = [];
const RAW_MAX = 600;

export function pushRaw(ts: number, price: number): void {
  rawBuffer.push({ ts, price });
  if (rawBuffer.length > RAW_MAX) rawBuffer.splice(0, rawBuffer.length - RAW_MAX);
}

export function getRawSince(sinceTs: number): { ts: number; price: number }[] {
  return rawBuffer.filter((r) => r.ts >= sinceTs);
}

export function clearAll(): void {
  mmkv.delete(K.SETTINGS);
  mmkv.delete(K.WATCHES);
  mmkv.delete(K.ALERTS);
  mmkv.delete(K.MINUTES);
  rawBuffer.length = 0;
  nextWatchId = 1;
}

export function clearHistoryOnly(): void {
  mmkv.delete(K.MINUTES);
  rawBuffer.length = 0;
}
