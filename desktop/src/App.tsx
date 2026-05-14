import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { bridge } from './ipc/bridge';
import { useAppStore } from './store/useAppStore';
import { insertRawPrice, listWatches, pruneOldRaw } from './db/repos';
import { feedPrice } from './utils/aggregator';
import { evaluateOnTick } from './services/alertEngine';
import { hydrateDailyStats } from './services/dailyStats';
import Overview from './pages/Overview';
import Watches from './pages/Watches';
import Chart from './pages/Chart';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

export default function App() {
  const setSettings = useAppStore((s) => s.setSettings);
  const setStatus = useAppStore((s) => s.setStatus);
  const pushTick = useAppStore((s) => s.pushTick);
  const setWatches = useAppStore((s) => s.setWatches);
  const dayOpenPrice = useAppStore((s) => s.dayOpenPrice);
  const yesterdayClose = useAppStore((s) => s.yesterdayClose);
  const lastBaselineRef = useRef<{ dayOpen: number | null; yesterdayClose: number | null }>({
    dayOpen: null,
    yesterdayClose: null,
  });

  useEffect(() => {
    if (
      lastBaselineRef.current.dayOpen === dayOpenPrice &&
      lastBaselineRef.current.yesterdayClose === yesterdayClose
    ) {
      return;
    }
    lastBaselineRef.current = { dayOpen: dayOpenPrice, yesterdayClose };
    void bridge().floater.publishBaseline({ dayOpen: dayOpenPrice, yesterdayClose });
  }, [dayOpenPrice, yesterdayClose]);

  useEffect(() => {
    const api = bridge();
    let pruneCounter = 0;

    void (async () => {
      const [settings, status, watches] = await Promise.all([
        api.settings.get(),
        api.fetcher.getStatus(),
        listWatches(),
      ]);
      setSettings(settings);
      setStatus(status);
      setWatches(watches);
      await hydrateDailyStats();
    })();

    const offTick = api.fetcher.onPriceUpdate(async (tick) => {
      pushTick(tick);
      try {
        await insertRawPrice({ ts: tick.ts, price: tick.price, source: tick.source });
        await feedPrice(tick.ts, tick.price);
        if (++pruneCounter % 60 === 0) {
          await pruneOldRaw();
        }
        await evaluateOnTick(tick);
      } catch (e) {
        console.error('[tick handler]', e);
      }
    });

    const offStatus = api.fetcher.onStatus((s) => setStatus(s));

    return () => {
      offTick();
      offStatus();
    };
  }, [pushTick, setSettings, setStatus, setWatches]);

  return (
    <div className="flex h-full w-full bg-gold-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/watches" element={<Watches />} />
            <Route path="/chart" element={<Chart />} />
            <Route path="/history" element={<History />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
