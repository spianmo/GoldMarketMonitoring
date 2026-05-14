import { bridge } from '../ipc/bridge';
import { useAppStore } from '../store/useAppStore';

const INTERVAL_OPTIONS = [
  { value: 2000, label: '2 秒' },
  { value: 5000, label: '5 秒' },
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 300000, label: '5 分钟' },
];

export default function SettingsCard() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  const updateInterval = async (v: number) => {
    const next = await bridge().settings.set({ intervalMs: v });
    setSettings(next);
  };

  const toggleNotification = async () => {
    const next = await bridge().settings.set({
      notificationEnabled: !settings.notificationEnabled,
    });
    setSettings(next);
  };

  const toggleSound = async () => {
    const next = await bridge().settings.set({
      notificationSound: !settings.notificationSound,
    });
    setSettings(next);
  };

  const toggleTray = async () => {
    const next = await bridge().settings.set({
      minimizeToTrayOnClose: !settings.minimizeToTrayOnClose,
    });
    setSettings(next);
  };

  const toggleFloater = async () => {
    const next = await bridge().settings.set({
      floaterEnabled: !settings.floaterEnabled,
    });
    setSettings(next);
  };

  return (
    <div className="card-lg">
      <div className="text-sm text-ink-700 font-medium mb-4">盯盘设置</div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-ink-700">盯盘频率</div>
        <select
          value={settings.intervalMs}
          onChange={(e) => updateInterval(Number(e.target.value))}
          className="bg-gold-50 border border-gold-200 rounded-lg px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-gold-300"
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Toggle
        label="系统通知"
        hint="条件触发时显示系统通知"
        checked={settings.notificationEnabled}
        onChange={toggleNotification}
      />

      <div className="mt-3">
        <Toggle
          label="通知声音"
          hint="开启后通知伴随提示音"
          checked={settings.notificationSound}
          onChange={toggleSound}
        />
      </div>

      <div className="mt-3">
        <Toggle
          label="关闭时最小化到托盘"
          hint="点击窗口关闭按钮时隐藏到状态栏,不退出应用"
          checked={settings.minimizeToTrayOnClose}
          onChange={toggleTray}
        />
      </div>

      <div className="mt-3">
        <Toggle
          label="桌面悬浮窗"
          hint="始终置顶的小窗口实时显示金价,可拖动到任意位置"
          checked={settings.floaterEnabled}
          onChange={toggleFloater}
        />
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}

function Toggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-ink-700">{label}</div>
        {hint && <div className="text-[11px] text-ink-500 mt-0.5">{hint}</div>}
      </div>
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
    </div>
  );
}
