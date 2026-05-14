import { useEffect, useState } from 'react';
import { listAlerts } from '../db/repos';
import { formatDateTime, formatPrice } from '../utils/parsePrice';
import type { AlertRecord } from '../../shared/types';

export default function Alerts() {
  const [rows, setRows] = useState<AlertRecord[]>([]);

  useEffect(() => {
    const load = async () => setRows(await listAlerts(500));
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-ink-900">提醒记录</h1>
      <div className="card-lg">
        {rows.length === 0 ? (
          <div className="text-center text-ink-500 py-8">暂无提醒记录</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-500">
                <th className="py-2 font-normal">时间</th>
                <th className="py-2 font-normal">条目</th>
                <th className="py-2 font-normal">触发价格</th>
                <th className="py-2 font-normal">详情</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100">
                  <td className="py-2 text-ink-700 font-mono text-xs">{formatDateTime(r.ts)}</td>
                  <td className="py-2 text-ink-900">{r.watchName}</td>
                  <td className="py-2 text-ink-900 font-mono">
                    {formatPrice(r.priceAtTrigger)} 元/克
                  </td>
                  <td className="py-2 text-ink-500">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
