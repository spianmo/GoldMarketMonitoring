import {
  alertMessage,
  describeCondition,
  evaluate,
  pushToBark,
  type PriceTick,
  type WatchItem,
} from '@goldmarket/shared';
import { insertAlert, listWatches, updateWatch, getSettings } from './storage';

export interface EvalState {
  prevPrice: number | null;
  dayOpenPrice: number | null;
}

export async function evaluateOnTick(tick: PriceTick, state: EvalState): Promise<WatchItem[]> {
  const settings = getSettings();
  const watches = listWatches();
  const ctx = {
    currentPrice: tick.price,
    prevPrice: state.prevPrice,
    dayOpenPrice: state.dayOpenPrice,
  };

  for (const w of watches) {
    if (!w.enabled) continue;
    const hit = evaluate(w, ctx);
    if (!hit) continue;
    if (w.mode === 'oneShot' && w.triggered) continue;

    const msg = alertMessage(w, ctx);
    insertAlert({
      watchId: w.id!,
      watchName: w.name,
      operator: w.operator,
      threshold: w.threshold,
      priceAtTrigger: tick.price,
      ts: tick.ts,
      message: msg,
    });
    updateWatch(w.id!, { lastTriggeredAt: tick.ts, triggered: true });

    const title = `黄金价格提醒 · ${w.name}`;
    const body = `${msg}\n触发条件: ${describeCondition(w)}`;

    if (settings.barkEnabled && settings.barkUrl) {
      void pushToBark(
        { url: settings.barkUrl },
        {
          title,
          body,
          level: settings.barkLevel,
          sound: settings.barkSound || undefined,
          group: '黄金盯盘',
        },
      ).then((r) => {
        if (!r.ok) console.warn('[bark] push failed:', r.message);
      });
    }
  }

  return listWatches();
}
