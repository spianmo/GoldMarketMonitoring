import PriceChart from '../components/PriceChart';

export default function ChartPage() {
  return (
    <div className="h-full flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-ink-900">价格图表</h1>
      <div className="flex-1 min-h-[480px]">
        <PriceChart />
      </div>
    </div>
  );
}
