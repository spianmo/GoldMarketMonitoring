import PriceCard from '../components/PriceCard';
import SettingsCard from '../components/SettingsCard';
import PriceChart from '../components/PriceChart';
import WatchTable from '../components/WatchTable';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <PriceCard />
          <SettingsCard />
        </div>
        <div className="xl:col-span-3 flex flex-col min-h-[420px]">
          <PriceChart />
        </div>
      </div>
      <WatchTable />
    </div>
  );
}
