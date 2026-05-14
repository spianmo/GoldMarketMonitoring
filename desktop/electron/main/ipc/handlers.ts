import { BrowserWindow, ipcMain } from 'electron';
import type { Fetcher } from '../fetcher';
import { showNotification } from '../notify';
import { getSettings, setSettings } from '../store/settings';
import type { AppSettings, FloaterBaseline, NotifyPayload } from '@goldmarket/shared';
import { IPC_CHANNELS } from '@goldmarket/shared';

interface FloaterApi {
  toggle: () => void;
  show: () => void;
  hide: () => void;
  openMain: () => void;
  getVisible: () => boolean;
}

interface RegisterOptions {
  getFetcher: () => Fetcher;
  onSettingsChange?: (next: AppSettings) => void;
  floater: FloaterApi;
}

let baselineCache: FloaterBaseline = { dayOpen: null, yesterdayClose: null };

export function setBaseline(b: FloaterBaseline): void {
  baselineCache = b;
}

export function registerIpc(opts: RegisterOptions) {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => getSettings());

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_e, patch) => {
    const next = setSettings(patch ?? {});
    opts.getFetcher().applySettings(next);
    opts.onSettingsChange?.(next);
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.FETCHER_TRIGGER_NOW, () => opts.getFetcher().triggerNow());
  ipcMain.handle(IPC_CHANNELS.FETCHER_GET_STATUS, () => opts.getFetcher().getStatus());

  ipcMain.handle(IPC_CHANNELS.NOTIFY_SHOW, (_e, payload: NotifyPayload) => {
    if (!payload || typeof payload !== 'object') return;
    showNotification(payload);
  });

  ipcMain.handle(IPC_CHANNELS.FLOATER_TOGGLE, () => {
    opts.floater.toggle();
    return opts.floater.getVisible();
  });
  ipcMain.handle(IPC_CHANNELS.FLOATER_SHOW, () => opts.floater.show());
  ipcMain.handle(IPC_CHANNELS.FLOATER_HIDE, () => opts.floater.hide());
  ipcMain.handle(IPC_CHANNELS.FLOATER_OPEN_MAIN, () => opts.floater.openMain());

  ipcMain.handle(IPC_CHANNELS.FLOATER_GET_BASELINE, () => baselineCache);
  ipcMain.handle(
    IPC_CHANNELS.FLOATER_PUBLISH_BASELINE,
    (_e, baseline: FloaterBaseline) => {
      baselineCache = baseline;
      broadcast(IPC_CHANNELS.FLOATER_PUBLISH_BASELINE, baseline);
    },
  );
}

export function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
