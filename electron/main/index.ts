import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { Fetcher } from './fetcher';
import { broadcast, registerIpc } from './ipc/handlers';
import { getSettings } from './store/settings';
import { IPC_CHANNELS } from '../../shared/types';

const DEV_URL = process.env.RSBUILD_DEV_URL;
const isDev = !!DEV_URL;

let mainWindow: BrowserWindow | null = null;
let fetcher: Fetcher | null = null;

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

  mainWindow.once('ready-to-show', () => mainWindow?.show());
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

function bootFetcher() {
  const settings = getSettings();
  fetcher = new Fetcher(settings);
  fetcher.on('tick', (tick) => {
    console.log(
      `[fetcher] tick price=${tick.price} source=${tick.source} ts=${new Date(tick.ts).toISOString()}`,
    );
    broadcast(IPC_CHANNELS.PRICE_UPDATE, tick);
  });
  fetcher.on('status', (status) => {
    if (status.state === 'error') {
      console.warn(`[fetcher] error: ${status.lastError}`);
    }
    broadcast(IPC_CHANNELS.FETCHER_STATUS, status);
  });
  fetcher.start();
  console.log(`[fetcher] started interval=${settings.intervalMs}ms`);
}

app.setName('黄金盯盘');

app.whenReady().then(() => {
  bootFetcher();
  registerIpc(() => {
    if (!fetcher) throw new Error('fetcher not initialized');
    return fetcher;
  });
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    fetcher?.destroy();
    app.quit();
  }
});

app.on('before-quit', () => {
  fetcher?.destroy();
});
