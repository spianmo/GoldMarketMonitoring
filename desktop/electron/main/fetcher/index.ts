import { EventEmitter } from 'node:events';
import type {
  AppSettings,
  FetchSource,
  FetcherStatus,
  PriceTick,
} from '@goldmarket/shared';
import { fetchPriceByHttp } from './fetchByHttp';
import { fetchPriceByWindow, destroyFetcherWindow } from './fetchByWindow';

type FetcherEvents = {
  tick: [PriceTick];
  status: [FetcherStatus];
};

export class Fetcher extends EventEmitter<FetcherEvents> {
  private timer: NodeJS.Timeout | null = null;
  private inflight = false;
  private settings: AppSettings;
  private status: FetcherStatus;
  private httpFailureStreak = 0;
  private windowSuccessStreak = 0;

  constructor(settings: AppSettings) {
    super();
    this.settings = settings;
    this.status = {
      state: 'idle',
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
      consecutiveFailures: 0,
      activeSource: 'http',
      nextTickAt: null,
      intervalMs: settings.intervalMs,
    };
  }

  getStatus(): FetcherStatus {
    return { ...this.status };
  }

  start() {
    this.stop();
    this.scheduleNext(0);
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.status.nextTickAt = null;
    this.emitStatus();
  }

  destroy() {
    this.stop();
    destroyFetcherWindow();
    this.removeAllListeners();
  }

  applySettings(next: AppSettings) {
    const intervalChanged = next.intervalMs !== this.settings.intervalMs;
    this.settings = next;
    this.status.intervalMs = next.intervalMs;
    if (intervalChanged && this.timer) {
      this.start();
    }
    this.emitStatus();
  }

  async triggerNow(): Promise<PriceTick | null> {
    if (this.inflight) return null;
    return this.runOnce();
  }

  private scheduleNext(delayMs: number) {
    if (this.timer) clearTimeout(this.timer);
    this.status.nextTickAt = Date.now() + delayMs;
    this.emitStatus();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runOnce().finally(() => {
        this.scheduleNext(this.settings.intervalMs);
      });
    }, delayMs);
  }

  private async runOnce(): Promise<PriceTick | null> {
    if (this.inflight) return null;
    this.inflight = true;
    this.status.state = 'running';
    this.emitStatus();

    const preferredSource: FetchSource =
      this.httpFailureStreak >= this.settings.failoverThreshold ? 'window' : 'http';

    try {
      let tick: PriceTick;
      if (preferredSource === 'http') {
        try {
          const { price, raw } = await fetchPriceByHttp();
          tick = { ts: Date.now(), price, source: 'http', raw };
          this.httpFailureStreak = 0;
          this.windowSuccessStreak = 0;
        } catch (httpErr) {
          this.httpFailureStreak += 1;
          if (this.httpFailureStreak >= this.settings.failoverThreshold) {
            const { price, raw } = await fetchPriceByWindow();
            tick = { ts: Date.now(), price, source: 'window', raw };
          } else {
            throw httpErr;
          }
        }
      } else {
        try {
          const { price, raw } = await fetchPriceByWindow();
          tick = { ts: Date.now(), price, source: 'window', raw };
          this.windowSuccessStreak += 1;
          if (this.windowSuccessStreak >= this.settings.recoveryThreshold) {
            try {
              const probe = await fetchPriceByHttp(5000);
              tick = { ts: Date.now(), price: probe.price, source: 'http', raw: probe.raw };
              this.httpFailureStreak = 0;
              this.windowSuccessStreak = 0;
            } catch {
              // stay on window
            }
          }
        } catch (winErr) {
          this.windowSuccessStreak = 0;
          throw winErr;
        }
      }

      this.status.state = 'idle';
      this.status.lastSuccessAt = tick.ts;
      this.status.lastError = null;
      this.status.consecutiveFailures = 0;
      this.status.activeSource = tick.source;
      this.emit('tick', tick);
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

  private emitStatus() {
    this.emit('status', this.getStatus());
  }
}
