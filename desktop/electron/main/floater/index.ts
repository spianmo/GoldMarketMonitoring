import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import type {
  AppSettings,
  FloaterPosition,
  FloaterSize,
} from '@goldmarket/shared';
import { FLOATER_SIZE_DIMENSIONS } from '@goldmarket/shared';

export interface FloaterCallbacks {
  onOpenMain: () => void;
  onPositionChanged: (pos: FloaterPosition) => void;
  onVisibilityChanged?: (visible: boolean) => void;
}

const DEV_URL = process.env.RSBUILD_DEV_URL;
const isDev = !!DEV_URL;

function preloadPath(): string {
  return path.join(app.getAppPath(), 'dist/preload/index.js');
}

function dim(size: FloaterSize) {
  return FLOATER_SIZE_DIMENSIONS[size];
}

function defaultPosition(size: FloaterSize): FloaterPosition {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const { width, height } = dim(size);
  return {
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24 + height,
  };
}

function clampToScreen(pos: FloaterPosition, size: FloaterSize): FloaterPosition {
  const display = screen.getDisplayNearestPoint({ x: pos.x, y: pos.y });
  const { workArea } = display;
  const { width, height } = dim(size);
  const minX = workArea.x;
  const maxX = workArea.x + workArea.width - width;
  const minY = workArea.y;
  const maxY = workArea.y + workArea.height - height;
  return {
    x: Math.min(Math.max(pos.x, minX), maxX),
    y: Math.min(Math.max(pos.y, minY), maxY),
  };
}

export class FloaterManager {
  private window: BrowserWindow | null = null;
  private settings: AppSettings;
  private callbacks: FloaterCallbacks;
  private saveTimer: NodeJS.Timeout | null = null;
  private lastSavedPos: FloaterPosition | null = null;

  constructor(settings: AppSettings, callbacks: FloaterCallbacks) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  isVisible(): boolean {
    return !!this.window && !this.window.isDestroyed() && this.window.isVisible();
  }

  show(): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
      return;
    }
    if (!this.window.isVisible()) {
      this.window.showInactive();
      this.callbacks.onVisibilityChanged?.(true);
    }
  }

  hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
      this.callbacks.onVisibilityChanged?.(false);
    }
  }

  toggle(): void {
    if (this.isVisible()) this.hide();
    else this.show();
  }

  close(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
    this.callbacks.onVisibilityChanged?.(false);
  }

  applySettings(next: AppSettings): void {
    const prev = this.settings;
    this.settings = next;
    if (this.window && !this.window.isDestroyed()) {
      if (prev.floaterOpacity !== next.floaterOpacity) {
        this.window.setOpacity(next.floaterOpacity);
      }
      if (prev.floaterAlwaysOnTop !== next.floaterAlwaysOnTop) {
        this.window.setAlwaysOnTop(next.floaterAlwaysOnTop, 'floating');
      }
      if (prev.floaterSize !== next.floaterSize) {
        this.applySize(next.floaterSize);
      }
      const prevPos = prev.floaterPosition;
      const nextPos = next.floaterPosition;
      const sizeChanged = prev.floaterSize !== next.floaterSize;
      const positionExternallyChanged =
        !sizeChanged &&
        (nextPos === null ||
          prevPos?.x !== nextPos?.x ||
          prevPos?.y !== nextPos?.y);
      if (positionExternallyChanged) {
        const target = clampToScreen(
          nextPos ?? defaultPosition(next.floaterSize),
          next.floaterSize,
        );
        const [curX, curY] = this.window.getPosition();
        if (curX !== target.x || curY !== target.y) {
          this.window.setPosition(target.x, target.y, false);
        }
      }
    }
    if (prev.floaterEnabled !== next.floaterEnabled) {
      if (next.floaterEnabled) this.show();
      else this.close();
    }
  }

  acceptStoredSettings(next: AppSettings): void {
    this.settings = next;
  }

  private applySize(size: FloaterSize): void {
    if (!this.window || this.window.isDestroyed()) return;
    const { width, height } = dim(size);
    const [curX, curY] = this.window.getPosition();
    const target = clampToScreen({ x: curX, y: curY }, size);
    this.window.setBounds(
      { x: target.x, y: target.y, width, height },
      false,
    );
  }

  private create(): void {
    const size = this.settings.floaterSize;
    const { width, height } = dim(size);
    const pos = clampToScreen(
      this.settings.floaterPosition ?? defaultPosition(size),
      size,
    );

    this.window = new BrowserWindow({
      width,
      height,
      x: pos.x,
      y: pos.y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      show: false,
      alwaysOnTop: this.settings.floaterAlwaysOnTop,
      acceptFirstMouse: true,
      opacity: this.settings.floaterOpacity,
      webPreferences: {
        preload: preloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false,
      },
    });

    if (this.settings.floaterAlwaysOnTop) {
      this.window.setAlwaysOnTop(true, 'floating');
    }
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    this.window.on('move', () => this.queueSavePosition());
    this.window.on('closed', () => {
      this.window = null;
      this.callbacks.onVisibilityChanged?.(false);
    });
    this.window.once('ready-to-show', () => {
      this.window?.showInactive();
      this.callbacks.onVisibilityChanged?.(true);
    });

    if (isDev && DEV_URL) {
      void this.window.loadURL(`${DEV_URL}/floater.html`);
    } else {
      void this.window.loadFile(
        path.join(app.getAppPath(), 'dist/renderer/floater.html'),
      );
    }
  }

  private queueSavePosition(): void {
    if (!this.window || this.window.isDestroyed()) return;
    const [x, y] = this.window.getPosition();
    const pos: FloaterPosition = { x, y };
    if (
      this.lastSavedPos &&
      this.lastSavedPos.x === pos.x &&
      this.lastSavedPos.y === pos.y
    ) {
      return;
    }
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.lastSavedPos = pos;
      this.callbacks.onPositionChanged(pos);
    }, 400);
  }

  requestOpenMain(): void {
    this.callbacks.onOpenMain();
  }
}
