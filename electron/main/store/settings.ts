import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../../../shared/types';
import { DEFAULT_SETTINGS } from '../../../shared/types';

const FILE_NAME = 'gold-watcher-settings.json';

function filePath(): string {
  return path.join(app.getPath('userData'), FILE_NAME);
}

function readFromDisk(): AppSettings {
  try {
    const raw = fs.readFileSync(filePath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeToDisk(value: AppSettings): void {
  try {
    const target = filePath();
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(value, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[settings] write failed:', e);
  }
}

let cache: AppSettings | null = null;

export function getSettings(): AppSettings {
  if (!cache) cache = readFromDisk();
  return { ...cache };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next: AppSettings = { ...getSettings(), ...patch };
  if (typeof next.intervalMs !== 'number' || next.intervalMs < 1000) {
    next.intervalMs = 1000;
  }
  if (typeof next.failoverThreshold !== 'number' || next.failoverThreshold < 1) {
    next.failoverThreshold = 1;
  }
  if (typeof next.recoveryThreshold !== 'number' || next.recoveryThreshold < 1) {
    next.recoveryThreshold = 1;
  }
  cache = next;
  writeToDisk(next);
  return next;
}
