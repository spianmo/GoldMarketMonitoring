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

export interface FloaterPosition {
  x: number;
  y: number;
}

export type FloaterSize = 'small' | 'medium' | 'large';

export const FLOATER_SIZE_DIMENSIONS: Record<FloaterSize, { width: number; height: number }> = {
  small: { width: 208, height: 60 },
  medium: { width: 256, height: 132 },
  large: { width: 296, height: 224 },
};

export const FLOATER_SIZE_LABELS: Record<FloaterSize, string> = {
  small: '小',
  medium: '中',
  large: '大',
};

export interface AppSettings {
  intervalMs: number;
  notificationEnabled: boolean;
  failoverThreshold: number;
  recoveryThreshold: number;
  notificationSound: boolean;
  minimizeToTrayOnClose: boolean;
  showPriceInTray: boolean;
  floaterEnabled: boolean;
  floaterPosition: FloaterPosition | null;
  floaterOpacity: number;
  floaterAlwaysOnTop: boolean;
  floaterIgnoreMouseUntilHover: boolean;
  floaterSize: FloaterSize;
}

export const DEFAULT_SETTINGS: AppSettings = {
  intervalMs: 2000,
  notificationEnabled: true,
  failoverThreshold: 3,
  recoveryThreshold: 5,
  notificationSound: false,
  minimizeToTrayOnClose: true,
  showPriceInTray: true,
  floaterEnabled: false,
  floaterPosition: null,
  floaterOpacity: 0.95,
  floaterAlwaysOnTop: true,
  floaterIgnoreMouseUntilHover: false,
  floaterSize: 'medium',
};

export interface FloaterBaseline {
  dayOpen: number | null;
  yesterdayClose: number | null;
}

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
  FLOATER_TOGGLE: 'floater:toggle',
  FLOATER_SHOW: 'floater:show',
  FLOATER_HIDE: 'floater:hide',
  FLOATER_OPEN_MAIN: 'floater:open-main',
  FLOATER_PUBLISH_BASELINE: 'floater:publish-baseline',
  FLOATER_GET_BASELINE: 'floater:get-baseline',
  FLOATER_SAVE_BASELINE: 'floater:save-baseline',
} as const;
