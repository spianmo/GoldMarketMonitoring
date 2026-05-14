import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { createWatch, updateWatch } from '../db/repos';
import type { WatchItem, WatchMode, WatchOperator } from '../../shared/types';
import { OPERATOR_LABEL } from '../utils/evaluator';
import { useAppStore } from '../store/useAppStore';

interface Props {
  initial?: WatchItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const OPERATORS: WatchOperator[] = [
  'priceGte',
  'priceLte',
  'pctChangeGte',
  'pctChangeLte',
  'deltaGte',
];

const UNIT_FOR: Record<WatchOperator, string> = {
  priceGte: '元',
  priceLte: '元',
  pctChangeGte: '%',
  pctChangeLte: '%',
  deltaGte: '元',
};

export default function AddWatchModal({ initial, onClose, onSaved }: Props) {
  const current = useAppStore((s) => s.currentTick);
  const [name, setName] = useState(initial?.name ?? '');
  const [operator, setOperator] = useState<WatchOperator>(initial?.operator ?? 'priceGte');
  const [threshold, setThreshold] = useState<string>(
    initial?.threshold != null ? String(initial.threshold) : current ? current.price.toFixed(2) : '',
  );
  const [mode, setMode] = useState<WatchMode>(initial?.mode ?? 'oneShot');
  const [enabled, setEnabled] = useState<boolean>(initial?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [operator, threshold]);

  const placeholder = useMemo(() => {
    switch (operator) {
      case 'priceGte':
        return '例如 1050.00';
      case 'priceLte':
        return '例如 980.00';
      case 'pctChangeGte':
        return '例如 0.8';
      case 'pctChangeLte':
        return '例如 -0.8';
      case 'deltaGte':
        return '例如 1.00';
    }
  }, [operator]);

  const save = async () => {
    const t = Number(threshold);
    if (!name.trim()) return setError('请填写条目名称');
    if (!Number.isFinite(t)) return setError('请填写有效的阈值数字');

    if (initial?.id) {
      await updateWatch(initial.id, {
        name: name.trim(),
        operator,
        threshold: t,
        mode,
        enabled,
        triggered: false,
        lastTriggeredAt: null,
      });
    } else {
      await createWatch({
        name: name.trim(),
        operator,
        threshold: t,
        mode,
        enabled,
        triggered: false,
        lastTriggeredAt: null,
        createdAt: Date.now(),
      });
    }
    await onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-soft w-[440px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-ink-900">
            {initial ? '编辑监视条目' : '添加监视条目'}
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="名称">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如:突破1050"
              className="w-full bg-gold-50 border border-gold-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </Field>

          <Field label="条件">
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as WatchOperator)}
              className="w-full bg-gold-50 border border-gold-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABEL[op]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="阈值">
            <div className="relative">
              <input
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-gold-50 border border-gold-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                {UNIT_FOR[operator]}
              </span>
            </div>
          </Field>

          <Field label="提醒模式">
            <div className="flex gap-2">
              {(['oneShot', 'continuous'] as WatchMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${
                    mode === m
                      ? 'border-gold-500 bg-gold-50 text-gold-700'
                      : 'border-ink-100 text-ink-700 hover:bg-ink-100'
                  }`}
                >
                  {m === 'oneShot' ? '单次提醒' : '持续提醒'}
                </button>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="accent-gold-500"
            />
            创建后立即启用
          </label>

          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-ink-500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}
