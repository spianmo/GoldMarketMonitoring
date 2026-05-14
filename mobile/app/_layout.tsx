import '@/lib/encodingPolyfill';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduler } from '@/services/scheduler';
import { useAppStore } from '@/store/useAppStore';
import { feedPrice } from '@/services/aggregator';
import { evaluateOnTick } from '@/services/alertEngine';
import { pushRaw, getSettings, listWatches } from '@/services/storage';
import { registerBackgroundTask } from '@/services/backgroundTask';

export default function RootLayout() {
  const setSettings = useAppStore((s) => s.setSettings);
  const pushTick = useAppStore((s) => s.pushTick);
  const setWatches = useAppStore((s) => s.setWatches);
  const setStatus = useAppStore((s) => s.setStatus);

  useEffect(() => {
    setSettings(getSettings());
    setWatches(listWatches());

    scheduler.init();
    const offTick = scheduler.onTick((tick) => {
      const state = useAppStore.getState();
      pushRaw(tick.ts, tick.price);
      feedPrice(tick.ts, tick.price);
      pushTick(tick);
      void evaluateOnTick(tick, {
        prevPrice: state.currentTick?.price ?? null,
        dayOpenPrice: state.dayOpenPrice,
      }).then((next) => setWatches(next));
    });
    const offStatus = scheduler.onStatus((s) => setStatus(s));

    scheduler.setInterval(getSettings().intervalMs);
    scheduler.start();

    void registerBackgroundTask();

    return () => {
      offTick();
      offStatus();
      scheduler.destroy();
    };
  }, [pushTick, setSettings, setStatus, setWatches]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="watch/[id]"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: '监视条目',
              headerStyle: { backgroundColor: '#FAF8F3' },
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
