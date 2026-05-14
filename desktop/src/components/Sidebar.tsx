import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListFilter,
  LineChart,
  History as HistoryIcon,
  Bell,
  Settings as SettingsIcon,
  Database,
} from 'lucide-react';

const items = [
  { to: '/overview', label: '监控总览', Icon: LayoutDashboard },
  { to: '/watches', label: '监视条目', Icon: ListFilter },
  { to: '/chart', label: '价格图表', Icon: LineChart },
  { to: '/history', label: '历史数据', Icon: HistoryIcon },
  { to: '/alerts', label: '提醒记录', Icon: Bell },
  { to: '/settings', label: '设置', Icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-ink-100 flex flex-col">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-lg shadow-card">
          ¥
        </div>
        <div>
          <div className="font-semibold text-ink-900">黄金盯盘</div>
          <div className="text-[11px] text-ink-500">v1.0.0</div>
        </div>
      </div>

      <nav className="px-3 flex-1 space-y-1">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? 'bg-gold-100 text-gold-700 font-medium'
                  : 'text-ink-700 hover:bg-ink-100'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="m-3 mt-2 rounded-lg bg-gold-50 border border-gold-100 p-3 text-xs text-ink-700 flex items-center gap-2">
        <Database size={14} className="text-gold-600" />
        <div className="flex-1">
          <div className="text-[11px] text-ink-500">数据存储</div>
          <div className="flex items-center gap-1 text-ink-900">
            IndexedDB <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>
        </div>
      </div>
    </aside>
  );
}
