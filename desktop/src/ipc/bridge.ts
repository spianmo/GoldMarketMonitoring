import type {
  AppSettings,
  FetcherStatus,
  FloaterBaseline,
  NotifyPayload,
  PriceTick,
} from '@goldmarket/shared';

interface Api {
  settings: {
    get(): Promise<AppSettings>;
    set(patch: Partial<AppSettings>): Promise<AppSettings>;
  };
  fetcher: {
    triggerNow(): Promise<PriceTick | null>;
    getStatus(): Promise<FetcherStatus>;
    onPriceUpdate(cb: (tick: PriceTick) => void): () => void;
    onStatus(cb: (status: FetcherStatus) => void): () => void;
  };
  notify: {
    show(payload: NotifyPayload): Promise<void>;
  };
  floater: {
    toggle(): Promise<boolean>;
    show(): Promise<void>;
    hide(): Promise<void>;
    openMain(): Promise<void>;
    publishBaseline(baseline: FloaterBaseline): Promise<void>;
    getBaseline(): Promise<FloaterBaseline>;
    onBaseline(cb: (baseline: FloaterBaseline) => void): () => void;
  };
}

declare global {
  interface Window {
    api: Api;
  }
}

export function bridge(): Api {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error('window.api 未注入,preload 未加载');
  }
  return window.api;
}
