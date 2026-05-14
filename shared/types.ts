export type FetchSource = 'http' | 'window';

export interface PriceTick {
  ts: number;
  price: number;
  source: FetchSource;
  raw?: string;
}

export interface FetcherStatus {
  state: 'idle' | 'running' | 'error';
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  activeSource: FetchSource;
  nextTickAt: number | null;
  intervalMs: number;
}

export interface AppSettings {
  intervalMs: number;
  notificationEnabled: boolean;
  failoverThreshold: number;
  recoveryThreshold: number;
  notificationSound: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  intervalMs: 2000,
  notificationEnabled: true,
  failoverThreshold: 3,
  recoveryThreshold: 5,
  notificationSound: false,
};

export interface NotifyPayload {
  title: string;
  body: string;
  silent?: boolean;
}

export type WatchOperator =
  | 'priceGte'
  | 'priceLte'
  | 'pctChangeGte'
  | 'pctChangeLte'
  | 'deltaGte';

export type WatchMode = 'oneShot' | 'continuous';

export interface WatchItem {
  id?: number;
  name: string;
  operator: WatchOperator;
  threshold: number;
  mode: WatchMode;
  enabled: boolean;
  triggered: boolean;
  lastTriggeredAt: number | null;
  createdAt: number;
}

export interface AlertRecord {
  id?: number;
  watchId: number;
  watchName: string;
  operator: WatchOperator;
  threshold: number;
  priceAtTrigger: number;
  ts: number;
  message: string;
}

export const IPC_CHANNELS = {
  PRICE_UPDATE: 'price:update',
  FETCHER_STATUS: 'fetcher:status',
  FETCHER_TRIGGER_NOW: 'fetcher:trigger-now',
  FETCHER_GET_STATUS: 'fetcher:get-status',
  NOTIFY_SHOW: 'notify:show',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const;
