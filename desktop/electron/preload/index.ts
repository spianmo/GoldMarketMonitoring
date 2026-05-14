import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  FetcherStatus,
  FloaterBaseline,
  NotifyPayload,
  PriceTick,
} from '@goldmarket/shared';
import { IPC_CHANNELS } from '@goldmarket/shared';

type Listener<T> = (payload: T) => void;

function on<T>(channel: string, listener: Listener<T>): () => void {
  const wrapped = (_e: unknown, payload: T) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api = {
  settings: {
    get(): Promise<AppSettings> {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
    },
    set(patch: Partial<AppSettings>): Promise<AppSettings> {
      return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, patch);
    },
  },
  fetcher: {
    triggerNow(): Promise<PriceTick | null> {
      return ipcRenderer.invoke(IPC_CHANNELS.FETCHER_TRIGGER_NOW);
    },
    getStatus(): Promise<FetcherStatus> {
      return ipcRenderer.invoke(IPC_CHANNELS.FETCHER_GET_STATUS);
    },
    onPriceUpdate(listener: Listener<PriceTick>) {
      return on<PriceTick>(IPC_CHANNELS.PRICE_UPDATE, listener);
    },
    onStatus(listener: Listener<FetcherStatus>) {
      return on<FetcherStatus>(IPC_CHANNELS.FETCHER_STATUS, listener);
    },
  },
  notify: {
    show(payload: NotifyPayload): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.NOTIFY_SHOW, payload);
    },
  },
  floater: {
    toggle(): Promise<boolean> {
      return ipcRenderer.invoke(IPC_CHANNELS.FLOATER_TOGGLE);
    },
    show(): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.FLOATER_SHOW);
    },
    hide(): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.FLOATER_HIDE);
    },
    openMain(): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.FLOATER_OPEN_MAIN);
    },
    publishBaseline(baseline: FloaterBaseline): Promise<void> {
      return ipcRenderer.invoke(IPC_CHANNELS.FLOATER_PUBLISH_BASELINE, baseline);
    },
    getBaseline(): Promise<FloaterBaseline> {
      return ipcRenderer.invoke(IPC_CHANNELS.FLOATER_GET_BASELINE);
    },
    onBaseline(listener: Listener<FloaterBaseline>) {
      return on<FloaterBaseline>(IPC_CHANNELS.FLOATER_PUBLISH_BASELINE, listener);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
