import { useState } from 'react';
import { bridge } from '../ipc/bridge';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db/dexie';
import { resetAggregator } from '../utils/aggregator';
import {
  FLOATER_SIZE_LABELS,
  isValidBarkUrl,
  pushToBark,
  type FloaterSize,
} from '@goldmarket/shared';

type BarkLevel = 'active' | 'timeSensitive' | 'passive' | 'critical';
const BARK_LEVEL_OPTIONS: { value: BarkLevel; label: string; hint: string }[] = [
  { value: 'active', label: '普通', hint: '正常显示' },
  { value: 'timeSensitive', label: '即时', hint: '穿透勿扰' },
  { value: 'passive', label: '静默', hint: '不亮屏' },
  { value: 'critical', label: '紧急', hint: '穿透静音' },
];

const FLOATER_SIZE_HINTS: Record<FloaterSize, string> = {
  small: '208 × 60 · 价格 + 涨跌',
  medium: '256 × 132 · 价格 + 涨跌 + 时间 + 来源',
  large: '296 × 224 · 含流式折线图',
};

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  const [busy, setBusy] = useState(false);
  const [barkInput, setBarkInput] = useState(settings.barkUrl);
  const [barkTesting, setBarkTesting] = useState(false);
  const [barkResult, setBarkResult] = useState<{ ok: boolean; message: string } | null>(null);

  const update = async (patch: Partial<typeof settings>) => {
    const next = await bridge().settings.set(patch);
    setSettings(next);
  };

  const saveBarkUrl = async () => {
    const trimmed = barkInput.trim();
    if (trimmed && !isValidBarkUrl(trimmed)) {
      setBarkResult({ ok: false, message: 'URL 格式不合法,需如 https://api.day.app/<DeviceKey>/' });
      return;
    }
    await update({ barkUrl: trimmed });
    setBarkResult({ ok: true, message: trimmed ? '已保存' : '已清空' });
  };

  const testBark = async () => {
    setBarkTesting(true);
    setBarkResult(null);
    try {
      const r = await pushToBark(
        { url: barkInput.trim() || settings.barkUrl },
        {
          title: '黄金盯盘 · 测试推送',
          body: `这是一条来自桌面端的测试消息 · ${new Date().toLocaleTimeString('zh-CN')}`,
          level: settings.barkLevel,
          sound: settings.barkSound || undefined,
          group: '黄金盯盘',
        },
      );
      setBarkResult({
        ok: r.ok,
        message: r.ok ? '推送成功,请查看 Bark App' : `失败:${r.message ?? `HTTP ${r.status}`}`,
      });
    } finally {
      setBarkTesting(false);
    }
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

      <div className="card-lg space-y-4">
        <div className="text-sm text-ink-700 font-medium">托盘行为</div>

        <Row
          label="关闭时最小化到托盘"
          hint="点击窗口关闭按钮时隐藏到状态栏,从托盘菜单或图标可重新打开"
        >
          <SmallToggle
            checked={settings.minimizeToTrayOnClose}
            onChange={() => update({ minimizeToTrayOnClose: !settings.minimizeToTrayOnClose })}
          />
        </Row>

        <Row
          label="在 macOS 菜单栏显示金价"
          hint="开启后状态栏图标右侧显示 ¥1,026.32 实时价格文本"
        >
          <SmallToggle
            checked={settings.showPriceInTray}
            onChange={() => update({ showPriceInTray: !settings.showPriceInTray })}
          />
        </Row>
      </div>

      <div className="card-lg space-y-4">
        <div className="text-sm text-ink-700 font-medium">桌面悬浮窗</div>

        <Row
          label="启用悬浮窗"
          hint="无边框小窗口常驻桌面顶层,显示实时金价、涨跌与时间"
        >
          <SmallToggle
            checked={settings.floaterEnabled}
            onChange={() => update({ floaterEnabled: !settings.floaterEnabled })}
          />
        </Row>

        <Row
          label="始终置顶"
          hint="悬浮窗在所有应用上层显示,关闭后可作为普通窗口"
        >
          <SmallToggle
            checked={settings.floaterAlwaysOnTop}
            onChange={() => update({ floaterAlwaysOnTop: !settings.floaterAlwaysOnTop })}
          />
        </Row>

        <Row
          label="悬浮窗尺寸"
          hint={FLOATER_SIZE_HINTS[settings.floaterSize]}
        >
          <div className="flex items-center gap-1 bg-ink-100/60 rounded-lg p-0.5">
            {(['small', 'medium', 'large'] as FloaterSize[]).map((s) => {
              const active = s === settings.floaterSize;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ floaterSize: s })}
                  className={`text-xs px-3 py-1 rounded-md transition ${
                    active
                      ? 'bg-white text-gold-700 shadow-sm font-medium'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {FLOATER_SIZE_LABELS[s]}
                </button>
              );
            })}
          </div>
        </Row>

        <Row
          label={`不透明度 ${Math.round(settings.floaterOpacity * 100)}%`}
          hint="50% ~ 100%,过低可能影响识别"
        >
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.05}
            value={settings.floaterOpacity}
            onChange={(e) => update({ floaterOpacity: Number(e.target.value) })}
            className="w-40 accent-gold-500"
          />
        </Row>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => bridge().floater.show()}
            className="btn-ghost border border-ink-100"
          >
            立即显示
          </button>
          <button
            type="button"
            onClick={() => bridge().floater.hide()}
            className="btn-ghost border border-ink-100"
          >
            立即隐藏
          </button>
          <button
            type="button"
            onClick={() => update({ floaterPosition: null })}
            className="btn-ghost border border-ink-100"
            title="将悬浮窗重置到屏幕右上角默认位置"
          >
            重置位置
          </button>
        </div>
      </div>

      <div className="card-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink-700 font-medium">远程推送 (Bark)</div>
          <a
            href="https://bark.day.app/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-gold-600 hover:underline"
          >
            获取 Bark App ↗
          </a>
        </div>

        <Row
          label="启用 Bark 推送"
          hint="条件触发时,除本地通知外,额外通过 Bark 推送到手机"
        >
          <SmallToggle
            checked={settings.barkEnabled}
            onChange={() => update({ barkEnabled: !settings.barkEnabled })}
          />
        </Row>

        <div>
          <div className="text-xs text-ink-500 mb-1">
            推送地址(完整 URL)
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://api.day.app/<DeviceKey>/"
              value={barkInput}
              onChange={(e) => {
                setBarkInput(e.target.value);
                setBarkResult(null);
              }}
              className="flex-1 bg-gold-50 border border-gold-200 rounded-lg px-3 py-1.5 text-sm font-mono"
            />
            <button
              type="button"
              onClick={saveBarkUrl}
              className="btn-primary"
            >
              保存
            </button>
            <button
              type="button"
              disabled={barkTesting || !(barkInput.trim() || settings.barkUrl)}
              onClick={testBark}
              className="btn-ghost border border-ink-100"
            >
              {barkTesting ? '推送中…' : '发送测试'}
            </button>
          </div>
          {barkResult && (
            <div
              className={`mt-2 text-xs ${
                barkResult.ok ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {barkResult.message}
            </div>
          )}
          <div className="text-[11px] text-ink-500 mt-1.5">
            从 Bark App 设置中复制完整 URL,如{' '}
            <code className="bg-ink-100 rounded px-1">
              https://api.day.app/rYc7etuCgSdknHRWvnMtGV/
            </code>
            。支持自建服务器。
          </div>
        </div>

        <Row label="通知级别" hint="critical 可穿透静音,需在 Bark App 中授权">
          <div className="flex items-center gap-1 bg-ink-100/60 rounded-lg p-0.5">
            {BARK_LEVEL_OPTIONS.map((opt) => {
              const active = opt.value === settings.barkLevel;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ barkLevel: opt.value })}
                  title={opt.hint}
                  className={`text-xs px-2.5 py-1 rounded-md transition ${
                    active
                      ? 'bg-white text-gold-700 shadow-sm font-medium'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="自定义铃声" hint="Bark App 内置铃声名称,留空使用默认">
          <input
            type="text"
            placeholder="例如:bell / alarm / glass"
            value={settings.barkSound}
            onChange={(e) => update({ barkSound: e.target.value })}
            className="w-44 bg-gold-50 border border-gold-200 rounded-lg px-3 py-1.5 text-sm"
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

function SmallToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? 'bg-gold-500' : 'bg-ink-300'
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
