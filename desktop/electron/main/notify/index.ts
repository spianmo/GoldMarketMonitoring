import { Notification, nativeImage } from 'electron';
import path from 'node:path';
import type { NotifyPayload } from '@goldmarket/shared';

let iconPath: string | null = null;

export function setNotificationIcon(p: string) {
  iconPath = p;
}

export function showNotification(payload: NotifyPayload): void {
  if (!Notification.isSupported()) return;
  const opts: Electron.NotificationConstructorOptions = {
    title: payload.title,
    body: payload.body,
    silent: payload.silent ?? false,
  };
  if (iconPath) {
    try {
      const img = nativeImage.createFromPath(path.resolve(iconPath));
      if (!img.isEmpty()) opts.icon = img;
    } catch {
      // ignore
    }
  }
  new Notification(opts).show();
}
