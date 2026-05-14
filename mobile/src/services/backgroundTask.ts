import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchPrice } from './fetcher';
import { feedPrice } from './aggregator';
import { pushRaw } from './storage';
import { evaluateOnTick } from './alertEngine';

const TASK_NAME = 'goldmarket.background.fetch';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const r = await fetchPrice(15_000);
    pushRaw(r.ts, r.price);
    feedPrice(r.ts, r.price);
    await evaluateOnTick(
      { ts: r.ts, price: r.price, source: 'http', raw: r.raw },
      { prevPrice: null, dayOpenPrice: null },
    );
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.warn('[bg task] failed:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) return;
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('[bg task] register failed:', e);
  }
}

export async function unregisterBackgroundTask(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
  } catch {
    // ignore
  }
}
