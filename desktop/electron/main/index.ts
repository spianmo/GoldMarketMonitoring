import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { Fetcher } from './fetcher';
import { FloaterManager } from './floater';
import { broadcast, registerIpc } from './ipc/handlers';
import { getSettings, setSettings } from './store/settings';
import { TrayManager } from './tray';
import { IPC_CHANNELS } from '@goldmarket/shared';
import type { AppSettings } from '@goldmarket/shared';

const DEV_URL = process.env.RSBUILD_DEV_URL;
const isDev = !!DEV_URL;

let mainWindow: BrowserWindow | null = null;
let fetcher: Fetcher | null = null;
let tray: TrayManager | null = null;
let floater: FloaterManager | null = null;
let isQuitting = false;

function getPreloadPath(): string {
  return path.join(app.getAppPath(), 'dist/preload/index.js');
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#FAF8F3',
    title: '黄金盯盘',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    tray?.setWindowVisible(true);
  });

  mainWindow.on('show', () => tray?.setWindowVisible(true));
  mainWindow.on('hide', () => tray?.setWindowVisible(false));
  mainWindow.on('minimize', () => tray?.setWindowVisible(false));
  mainWindow.on('restore', () => tray?.setWindowVisible(true));

  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    const minimize = getSettings().minimizeToTrayOnClose;
    if (minimize) {
      event.preventDefault();
      mainWindow?.hide();
      if (process.platform === 'darwin') {
        app.dock?.hide();
      }
      tray?.setWindowVisible(false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && DEV_URL) {
    void mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }
}

function ensureMainWindowShown() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (process.platform === 'darwin') {
      void app.dock?.show();
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    tray?.setWindowVisible(true);
  } else {
    createMainWindow();
  }
}

function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
    if (process.platform === 'darwin') {
      app.dock?.hide();
    }
    tray?.setWindowVisible(false);
  } else {
    ensureMainWindowShown();
  }
}

function navigateMainWindow(route: string) {
  ensureMainWindowShown();
  const safe = route.startsWith('/') ? route : `/${route}`;
  const escaped = safe.replace(/'/g, "\\'");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents
      .executeJavaScript(`window.location.hash = '#${escaped}'`)
      .catch(() => undefined);
  }
}

function bootFetcher(settings: AppSettings) {
  fetcher = new Fetcher(settings);
  fetcher.on('tick', (tick) => {
    console.log(
      `[fetcher] tick price=${tick.price} source=${tick.source} ts=${new Date(tick.ts).toISOString()}`,
    );
    broadcast(IPC_CHANNELS.PRICE_UPDATE, tick);
    tray?.updatePrice(tick);
  });
  fetcher.on('status', (status) => {
    if (status.state === 'error') {
      console.warn(`[fetcher] error: ${status.lastError}`);
      tray?.setFetcherError(status.lastError);
    } else if (status.state === 'idle' || status.state === 'running') {
      tray?.setFetcherError(null);
    }
    broadcast(IPC_CHANNELS.FETCHER_STATUS, status);
  });
  fetcher.start();
  console.log(`[fetcher] started interval=${settings.intervalMs}ms`);
}

function bootTray(settings: AppSettings) {
  tray = new TrayManager(
    {
      onToggleWindow: toggleMainWindow,
      onShowWindow: ensureMainWindowShown,
      onTriggerNow: async () => {
        await fetcher?.triggerNow();
      },
      onOpenPage: (route) => navigateMainWindow(route),
      onToggleFloater: () => floater?.toggle(),
      isFloaterVisible: () => !!floater?.isVisible(),
      onSetFloaterSize: (s) => {
        const next = setSettings({ floaterSize: s, floaterEnabled: true });
        tray?.setSettings(next);
        floater?.applySettings(next);
      },
      onQuit: () => {
        isQuitting = true;
        app.quit();
      },
    },
    settings,
  );
  tray.init();
}

function bootFloater(settings: AppSettings) {
  floater = new FloaterManager(settings, {
    onOpenMain: ensureMainWindowShown,
    onPositionChanged: (pos) => {
      const next = setSettings({ floaterPosition: pos });
      floater?.acceptStoredSettings(next);
      tray?.setSettings(next);
    },
    onVisibilityChanged: (visible) => {
      tray?.setFloaterVisible(visible);
    },
  });
  if (settings.floaterEnabled) {
    floater.show();
  }
}

app.setName('黄金盯盘');

app.whenReady().then(() => {
  const settings = getSettings();
  bootFetcher(settings);
  bootTray(settings);
  bootFloater(settings);
  registerIpc(
    {
      getFetcher: () => {
        if (!fetcher) throw new Error('fetcher not initialized');
        return fetcher;
      },
      onSettingsChange: (next) => {
        tray?.setSettings(next);
        floater?.applySettings(next);
      },
      floater: {
        toggle: () => floater?.toggle(),
        show: () => floater?.show(),
        hide: () => floater?.hide(),
        openMain: () => ensureMainWindowShown(),
        getVisible: () => !!floater?.isVisible(),
      },
    },
  );
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      ensureMainWindowShown();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !getSettings().minimizeToTrayOnClose) {
    fetcher?.destroy();
    tray?.destroy();
    floater?.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  fetcher?.destroy();
  tray?.destroy();
  floater?.close();
});
