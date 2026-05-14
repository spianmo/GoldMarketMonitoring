import { BrowserWindow, ipcMain } from 'electron';
import type { Fetcher } from '../fetcher';
import { showNotification } from '../notify';
import { getSettings, setSettings } from '../store/settings';
import type { NotifyPayload } from '../../../shared/types';
import { IPC_CHANNELS } from '../../../shared/types';

export function registerIpc(getFetcher: () => Fetcher) {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => getSettings());

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_e, patch) => {
    const next = setSettings(patch ?? {});
    getFetcher().applySettings(next);
    return next;
  });

  ipcMain.handle(IPC_CHANNELS.FETCHER_TRIGGER_NOW, () => getFetcher().triggerNow());
  ipcMain.handle(IPC_CHANNELS.FETCHER_GET_STATUS, () => getFetcher().getStatus());

  ipcMain.handle(IPC_CHANNELS.NOTIFY_SHOW, (_e, payload: NotifyPayload) => {
    if (!payload || typeof payload !== 'object') return;
    showNotification(payload);
  });
}

export function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
