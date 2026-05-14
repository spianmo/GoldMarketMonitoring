import Dexie, { type Table } from 'dexie';
import type { AlertRecord, WatchItem } from '@goldmarket/shared';

export interface PriceRawRow {
  id?: number;
  ts: number;
  price: number;
  source: 'http' | 'window';
}

export interface PriceMinuteRow {
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
  count: number;
}

export interface KvRow<T = unknown> {
  key: string;
  value: T;
}

class GoldDb extends Dexie {
  prices_raw!: Table<PriceRawRow, number>;
  prices_minute!: Table<PriceMinuteRow, number>;
  watches!: Table<WatchItem, number>;
  alerts!: Table<AlertRecord, number>;
  settings!: Table<KvRow, string>;

  constructor() {
    super('GoldMarketMonitoring');
    this.version(1).stores({
      prices_raw: '++id, ts',
      prices_minute: '&minute',
      watches: '++id, createdAt, enabled',
      alerts: '++id, ts, watchId',
      settings: '&key',
    });
  }
}

export const db = new GoldDb();

export const RAW_RETENTION_MS = 24 * 60 * 60 * 1000;
