import { useEffect, useState } from 'react';
import { db } from '../db/dexie';
import { formatDateTime, formatPrice } from '@goldmarket/shared';

type Row = { ts: number; price: number; source: 'http' | 'window' };

export default function History() {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [minuteCount, setMinuteCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const recent = await db.prices_raw.orderBy('ts').reverse().limit(200).toArray();
      setRows(recent.map((r) => ({ ts: r.ts, price: r.price, source: r.source })));
      setCount(await db.prices_raw.count());
      setMinuteCount(await db.prices_minute.count());
    };
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink-900">历史数据</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="最近 24 小时原始记录" value={count} />
        <Stat label="分钟聚合(长期保留)" value={minuteCount} />
        <Stat label="展示最近条数" value={rows.length} />
      </div>
      <div className="card-lg">
        <div className="text-sm text-ink-700 font-medium mb-3">最近 200 条原始记录</div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-ink-500">
                <th className="py-2 font-normal">时间</th>
                <th className="py-2 font-normal">价格</th>
                <th className="py-2 font-normal">来源</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className="border-t border-ink-100">
                  <td className="py-2 text-ink-700 font-mono">{formatDateTime(r.ts)}</td>
                  <td className="py-2 text-ink-900 font-mono">{formatPrice(r.price)} 元/克</td>
                  <td className="py-2 text-ink-500">
                    {r.source === 'http' ? 'HTTP 直连' : '浏览器降级'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-ink-500 py-8">
                    暂无数据,等待抓取...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-2xl font-semibold text-ink-900 font-mono mt-1">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
