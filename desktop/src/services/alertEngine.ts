import { bridge } from '../ipc/bridge';
import { insertAlert, listWatches, updateWatch } from '../db/repos';
import { alertMessage, describeCondition, evaluate, pushToBark } from '@goldmarket/shared';
import { useAppStore } from '../store/useAppStore';
import type { PriceTick, WatchItem } from '@goldmarket/shared';

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

    const title = `黄金价格提醒 · ${w.name}`;
    const body = `${msg}\n触发条件: ${describeCondition(w)}`;

    if (settings.notificationEnabled) {
      void bridge().notify.show({
        title,
        body,
        silent: !settings.notificationSound,
      });
    }

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

  store.setWatches(await listWatches());
}
