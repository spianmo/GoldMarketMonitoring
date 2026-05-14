import { bridge } from '../ipc/bridge';
import { insertAlert, listWatches, updateWatch } from '../db/repos';
import { alertMessage, describeCondition, evaluate } from '../utils/evaluator';
import { useAppStore } from '../store/useAppStore';
import type { PriceTick, WatchItem } from '../../shared/types';

export async function evaluateOnTick(tick: PriceTick) {
  const store = useAppStore.getState();
  const settings = store.settings;
  const watches = await listWatches();
  store.setWatches(watches);

  const ctx = {
    currentPrice: tick.price,
    prevPrice: store.prevTick?.price ?? null,
    dayOpenPrice: store.dayOpenPrice,
  };

  for (const w of watches) {
    if (!w.enabled) continue;
    const hit = evaluate(w, ctx);
    if (!hit) continue;
    if (w.mode === 'oneShot' && w.triggered) continue;

    const msg = alertMessage(w, ctx);
    await insertAlert({
      watchId: w.id!,
      watchName: w.name,
      operator: w.operator,
      threshold: w.threshold,
      priceAtTrigger: tick.price,
      ts: tick.ts,
      message: msg,
    });

    const patch: Partial<WatchItem> = {
      lastTriggeredAt: tick.ts,
      triggered: true,
    };
    await updateWatch(w.id!, patch);

    if (settings.notificationEnabled) {
      void bridge().notify.show({
        title: `黄金价格提醒 · ${w.name}`,
        body: `${msg}\n触发条件: ${describeCondition(w)}`,
        silent: !settings.notificationSound,
      });
    }
  }

  store.setWatches(await listWatches());
}
