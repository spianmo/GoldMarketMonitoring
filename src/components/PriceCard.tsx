import { useAppStore } from '../store/useAppStore';
import { formatDelta, formatPct, formatPrice } from '../utils/parsePrice';

export default function PriceCard() {
  const cur = useAppStore((s) => s.currentTick);
  const dayOpen = useAppStore((s) => s.dayOpenPrice);
  const todayHigh = useAppStore((s) => s.todayHigh);
  const todayLow = useAppStore((s) => s.todayLow);
  const yClose = useAppStore((s) => s.yesterdayClose);

  const price = cur?.price ?? null;
  const base = dayOpen ?? null;
  const delta = price != null && base != null ? price - base : null;
  const pct = price != null && base != null && base !== 0 ? ((price - base) / base) * 100 : null;
  const upColor = (delta ?? 0) >= 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="card-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-ink-700 font-medium">浙商金价 (元/克)</div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold-100 text-gold-700">
          {cur ? '实时' : '等待数据'}
        </span>
      </div>

      <div className="flex items-end gap-3">
        <div className="text-5xl font-semibold tracking-tight text-gold-700 font-mono">
          {price != null ? formatPrice(price) : '—'}
        </div>
        <div className="pb-2 text-sm text-ink-500">元/克</div>
      </div>

      <div className={`mt-2 text-sm font-medium ${upColor}`}>
        {delta != null ? formatDelta(delta) : '—'}{' '}
        <span className="text-ink-500 mx-1">·</span>{' '}
        {pct != null ? formatPct(pct) : '—'}
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3 text-center">
        {[
          { label: '今日开盘', value: dayOpen },
          { label: '最高', value: todayHigh },
          { label: '最低', value: todayLow },
          { label: '昨收', value: yClose },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-[11px] text-ink-500">{item.label}</div>
            <div className="text-sm font-medium text-ink-900 font-mono">
              {item.value != null ? formatPrice(item.value) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
