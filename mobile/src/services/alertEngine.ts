import {
  alertMessage,
  describeCondition,
  evaluate,
  type PriceTick,
  type WatchItem,
} from '@goldmarket/shared';
import { insertAlert, listWatches, updateWatch, getSettings } from './storage';
import { fire } from './notify';

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

    if (settings.notificationEnabled) {
      void fire(`黄金价格提醒 · ${w.name}`, `${msg}\n触发条件: ${describeCondition(w)}`, {
        sound: settings.notificationSound,
      });
    }
  }

  return listWatches();
}
