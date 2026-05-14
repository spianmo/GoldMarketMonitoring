import { app, Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron';
import type { AppSettings, FloaterSize, PriceTick } from '../../../shared/types';
import { FLOATER_SIZE_LABELS } from '../../../shared/types';

const TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAh0lEQVR4nLWT0Q2AIAxESdikKzCCs7gMMzAOSzBFR9CSXBPAqEjjJe+nuastoHM/yQskBECoTakGdiEKCUTUwlt4gzkLLByAUYvw3H65GkoTHCnwXCbxGDE/hJUMb3cmhM480YDhpXH8NBFW0riGuYF5BfMh6hrL16gyPaR2kuWnrDL9TJ90Ak6yasVCYCzDAAAAAElFTkSuQmCC';

export interface TrayCallbacks {
  onToggleWindow: () => void;
  onShowWindow: () => void;
  onTriggerNow: () => Promise<void> | void;
  onOpenPage: (route: string) => void;
  onToggleFloater: () => void;
  isFloaterVisible: () => boolean;
  onSetFloaterSize: (size: FloaterSize) => void;
  onQuit: () => void;
}

interface PriceState {
  price: number | null;
  ts: number | null;
  source: 'http' | 'window' | null;
  fetcherError: string | null;
}

function formatPrice(price: number): string {
  return price.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export class TrayManager {
  private tray: Tray | null = null;
  private callbacks: TrayCallbacks;
  private state: PriceState = { price: null, ts: null, source: null, fetcherError: null };
  private windowVisible = true;
  private settings: AppSettings;

  constructor(callbacks: TrayCallbacks, settings: AppSettings) {
    this.callbacks = callbacks;
    this.settings = settings;
  }

  init(): void {
    if (this.tray) return;
    const image = nativeImage.createFromBuffer(Buffer.from(TRAY_ICON_BASE64, 'base64'));
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }
    this.tray = new Tray(image);
    this.tray.setToolTip('黄金盯盘 · 等待数据');
    this.tray.setIgnoreDoubleClickEvents(true);

    this.tray.on('click', () => {
      this.callbacks.onToggleWindow();
    });
    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu();
    });

    this.refresh();
  }

  destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
    }
    this.tray = null;
  }

  setSettings(next: AppSettings): void {
    this.settings = next;
    this.refresh();
  }

  setWindowVisible(visible: boolean): void {
    this.windowVisible = visible;
    this.refresh();
  }

  setFloaterVisible(_visible: boolean): void {
    this.refresh();
  }

  updatePrice(tick: PriceTick): void {
    this.state = {
      price: tick.price,
      ts: tick.ts,
      source: tick.source,
      fetcherError: null,
    };
    this.refresh();
  }

  setFetcherError(message: string | null): void {
    this.state = { ...this.state, fetcherError: message };
    this.refresh();
  }

  private refresh(): void {
    if (!this.tray || this.tray.isDestroyed()) return;
    this.applyTitle();
    this.applyTooltip();
    this.tray.setContextMenu(this.buildMenu());
  }

  private applyTitle(): void {
    if (!this.tray) return;
    if (process.platform !== 'darwin') return;
    if (!this.settings.showPriceInTray) {
      this.tray.setTitle('');
      return;
    }
    if (this.state.price == null) {
      this.tray.setTitle(' 等待…');
      return;
    }
    this.tray.setTitle(` ¥${formatPrice(this.state.price)}`);
  }

  private applyTooltip(): void {
    if (!this.tray) return;
    if (this.state.price == null) {
      this.tray.setToolTip('黄金盯盘 · 等待数据');
      return;
    }
    const parts: string[] = [`黄金盯盘 · ¥${formatPrice(this.state.price)} 元/克`];
    if (this.state.ts != null) parts.push(`更新于 ${formatTime(this.state.ts)}`);
    if (this.state.source) {
      parts.push(this.state.source === 'http' ? 'HTTP 直连' : '浏览器降级');
    }
    if (this.state.fetcherError) parts.push(`异常: ${this.state.fetcherError}`);
    this.tray.setToolTip(parts.join(' · '));
  }

  private buildMenu(): Menu {
    const priceLabel =
      this.state.price != null
        ? `当前 ¥${formatPrice(this.state.price)} 元/克`
        : '当前价格 · 等待数据';
    const tsLabel =
      this.state.ts != null ? `更新于 ${formatTime(this.state.ts)}` : '尚未抓取';

    const template: MenuItemConstructorOptions[] = [
      { label: priceLabel, enabled: false },
      { label: tsLabel, enabled: false },
      { type: 'separator' },
      {
        label: this.windowVisible ? '隐藏主窗口' : '显示主窗口',
        accelerator: process.platform === 'darwin' ? 'Cmd+Shift+G' : undefined,
        click: () => this.callbacks.onToggleWindow(),
      },
      {
        label: '立即抓取一次',
        accelerator: process.platform === 'darwin' ? 'Cmd+R' : undefined,
        click: () => {
          void this.callbacks.onTriggerNow();
        },
      },
      {
        label: this.callbacks.isFloaterVisible() ? '关闭桌面悬浮窗' : '显示桌面悬浮窗',
        click: () => this.callbacks.onToggleFloater(),
      },
      {
        label: '悬浮窗尺寸',
        submenu: (['small', 'medium', 'large'] as FloaterSize[]).map((s) => ({
          label: `${FLOATER_SIZE_LABELS[s]}${s === this.settings.floaterSize ? ' ✓' : ''}`,
          type: 'normal' as const,
          click: () => this.callbacks.onSetFloaterSize(s),
        })),
      },
      { type: 'separator' },
      {
        label: '打开监视条目',
        click: () => this.callbacks.onOpenPage('/watches'),
      },
      {
        label: '打开提醒记录',
        click: () => this.callbacks.onOpenPage('/alerts'),
      },
      {
        label: '打开设置',
        click: () => this.callbacks.onOpenPage('/settings'),
      },
      { type: 'separator' },
      {
        label: `关于 ${app.getName()}`,
        click: () => this.callbacks.onShowWindow(),
      },
      {
        label: '退出',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => this.callbacks.onQuit(),
      },
    ];
    return Menu.buildFromTemplate(template);
  }
}
