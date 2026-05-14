import { AppState, type AppStateStatus } from 'react-native';
import type { FetcherStatus, PriceTick } from '@goldmarket/shared';
import { fetchPrice } from './fetcher';

type TickListener = (tick: PriceTick) => void;
type StatusListener = (status: FetcherStatus) => void;

class Scheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private intervalMs = 2000;
  private inflight = false;
  private running = false;
  private status: FetcherStatus = {
    state: 'idle',
    lastSuccessAt: null,
    lastErrorAt: null,
    lastError: null,
    consecutiveFailures: 0,
    activeSource: 'http',
    nextTickAt: null,
    intervalMs: 2000,
  };
  private tickListeners = new Set<TickListener>();
  private statusListeners = new Set<StatusListener>();
  private appStateSub: { remove: () => void } | null = null;

  init() {
    if (this.appStateSub) return;
    this.appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') this.start();
      else this.stop();
    });
  }

  destroy() {
    this.stop();
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.tickListeners.clear();
    this.statusListeners.clear();
  }

  setInterval(ms: number) {
    this.intervalMs = Math.max(1000, ms);
    this.status.intervalMs = this.intervalMs;
    if (this.running) this.start();
    this.emitStatus();
  }

  getStatus(): FetcherStatus {
    return { ...this.status };
  }

  start() {
    this.running = true;
    this.scheduleNext(0);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.status.nextTickAt = null;
    this.emitStatus();
  }

  async triggerNow(): Promise<PriceTick | null> {
    if (this.inflight) return null;
    return this.runOnce();
  }

  onTick(cb: TickListener) {
    this.tickListeners.add(cb);
    return () => this.tickListeners.delete(cb);
  }

  onStatus(cb: StatusListener) {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private scheduleNext(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    if (!this.running) return;
    this.status.nextTickAt = Date.now() + delay;
    this.emitStatus();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runOnce().finally(() => {
        if (this.running) this.scheduleNext(this.intervalMs);
      });
    }, delay);
  }

  private async runOnce(): Promise<PriceTick | null> {
    if (this.inflight) return null;
    this.inflight = true;
    this.status.state = 'running';
    this.emitStatus();
    try {
      const r = await fetchPrice();
      const tick: PriceTick = {
        ts: r.ts,
        price: r.price,
        source: 'http',
        raw: r.raw,
      };
      this.status.state = 'idle';
      this.status.lastSuccessAt = r.ts;
      this.status.lastError = null;
      this.status.consecutiveFailures = 0;
      this.status.activeSource = 'http';
      this.emitTick(tick);
      this.emitStatus();
      return tick;
    } catch (err) {
      this.status.state = 'error';
      this.status.lastErrorAt = Date.now();
      this.status.lastError = err instanceof Error ? err.message : String(err);
      this.status.consecutiveFailures += 1;
      this.emitStatus();
      return null;
    } finally {
      this.inflight = false;
    }
  }

  private emitTick(t: PriceTick) {
    for (const cb of this.tickListeners) {
      try {
        cb(t);
      } catch (e) {
        console.warn('[scheduler] tick listener error', e);
      }
    }
  }

  private emitStatus() {
    const snap = this.getStatus();
    for (const cb of this.statusListeners) {
      try {
        cb(snap);
      } catch (e) {
        console.warn('[scheduler] status listener error', e);
      }
    }
  }
}

export const scheduler = new Scheduler();
