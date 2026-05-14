import { useState } from 'react';
import { bridge } from '../ipc/bridge';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db/dexie';
import { resetAggregator } from '../utils/aggregator';

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [busy, setBusy] = useState(false);

  const update = async (patch: Partial<typeof settings>) => {
    const next = await bridge().settings.set(patch);
    setSettings(next);
  };

  const clearHistory = async () => {
    if (!confirm('确定要清空所有历史数据(原始记录 + 分钟聚合)?监视条目和提醒记录不受影响。')) {
      return;
    }
    setBusy(true);
    try {
      await db.prices_raw.clear();
      await resetAggregator();
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!confirm('警告:将清空全部数据(包括监视条目和提醒记录),确认?')) return;
    setBusy(true);
    try {
      await Promise.all([
        db.prices_raw.clear(),
        db.prices_minute.clear(),
        db.watches.clear(),
        db.alerts.clear(),
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-ink-900">设置</h1>

      <div className="card-lg space-y-5">
        <div className="text-sm text-ink-700 font-medium">抓取策略</div>

        <Row label="盯盘频率 (毫秒)" hint="最小 1000ms。频率越高对数据源压力越大。">
          <input
            type="number"
            min={1000}
            step={500}
            value={settings.intervalMs}
            onChange={(e) => update({ intervalMs: Number(e.target.value) })}
            className="w-32 bg-gold-50 border border-gold-200 rounded-lg px-3 py-1.5 text-sm font-mono"
          />
        </Row>

        <Row label="主路径连续失败切到降级" hint="HTTP 直连失败 N 次后切到隐藏 BrowserWindow">
          <input
            type="number"
            min={1}
            max={20}
            value={settings.failoverThreshold}
            onChange={(e) => update({ failoverThreshold: Number(e.target.value) })}
            className="w-24 bg-gold-50 border border-gold-200 rounded-lg px-3 py-1.5 text-sm font-mono"
          />
        </Row>

        <Row label="降级路径连续成功探活回切" hint="降级路径稳定 M 次后尝试切回 HTTP">
          <input
            type="number"
            min={1}
            max={50}
            value={settings.recoveryThreshold}
            onChange={(e) => update({ recoveryThreshold: Number(e.target.value) })}
            className="w-24 bg-gold-50 border border-gold-200 rounded-lg px-3 py-1.5 text-sm font-mono"
          />
        </Row>
      </div>

      <div className="card-lg space-y-3">
        <div className="text-sm text-ink-700 font-medium">数据管理</div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={clearHistory}
            className="btn-ghost border border-ink-100"
          >
            清空历史数据
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={clearAll}
            className="btn-ghost border border-ink-100 hover:text-red-500"
          >
            重置全部数据
          </button>
        </div>
        <div className="text-xs text-ink-500">
          原始记录滚动保留 24 小时;分钟聚合长期保留。如需立即清理,使用上方按钮。
        </div>
      </div>

      <div className="card-lg text-xs text-ink-500 space-y-1">
        <div className="text-sm text-ink-700 font-medium mb-2">关于</div>
        <div>黄金盯盘 v1.0.0</div>
        <div>数据源:浙商银行公开行情页面(无需登录)</div>
        <div>金价为日金价,当日内通常更新 1~2 次,折线长时间持平属正常。</div>
        <div>macOS 开发期通知发件人显示为 "Electron" 是已知限制,打包后会显示为"黄金盯盘"。</div>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-ink-700">{label}</div>
        {hint && <div className="text-[11px] text-ink-500 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
