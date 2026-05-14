import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { deleteWatch, listWatches, updateWatch } from '../db/repos';
import { describeCondition } from '../utils/evaluator';
import { formatDateTime, formatPrice } from '../utils/parsePrice';
import AddWatchModal from './AddWatchModal';
import type { WatchItem } from '../../shared/types';

export default function WatchTable() {
  const watches = useAppStore((s) => s.watches);
  const setWatches = useAppStore((s) => s.setWatches);
  const current = useAppStore((s) => s.currentTick);
  const [editing, setEditing] = useState<WatchItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const refresh = async () => setWatches(await listWatches());

  const remove = async (id: number) => {
    await deleteWatch(id);
    await refresh();
  };

  const reset = async (id: number) => {
    await updateWatch(id, { triggered: false, lastTriggeredAt: null });
    await refresh();
  };

  const toggle = async (item: WatchItem) => {
    await updateWatch(item.id!, { enabled: !item.enabled });
    await refresh();
  };

  return (
    <div className="card-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-ink-700 font-medium">监视条目</div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={14} /> 添加条目
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 text-xs">
              <th className="py-2 font-normal">名称</th>
              <th className="py-2 font-normal">条件</th>
              <th className="py-2 font-normal">模式</th>
              <th className="py-2 font-normal">当前值</th>
              <th className="py-2 font-normal">状态</th>
              <th className="py-2 font-normal">创建时间</th>
              <th className="py-2 font-normal text-right pr-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {watches.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-ink-500 py-8">
                  暂无监视条目,点击右上角"添加条目"创建第一条规则。
                </td>
              </tr>
            )}
            {watches.map((w) => (
              <tr key={w.id} className="border-t border-ink-100">
                <td className="py-2.5 text-ink-900">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(w)}
                      className={`h-2 w-2 rounded-full ${
                        w.enabled ? 'bg-green-500' : 'bg-ink-300'
                      }`}
                      title={w.enabled ? '已启用 (点击禁用)' : '已禁用 (点击启用)'}
                    />
                    {w.name}
                  </div>
                </td>
                <td className="py-2.5 text-ink-700">{describeCondition(w)}</td>
                <td className="py-2.5 text-ink-700">
                  {w.mode === 'oneShot' ? '单次提醒' : '持续提醒'}
                </td>
                <td className="py-2.5 text-ink-900 font-mono">
                  {current ? formatPrice(current.price) : '—'}
                </td>
                <td className="py-2.5">
                  {w.triggered ? (
                    <span className="text-red-500 font-medium">● 已触发</span>
                  ) : (
                    <span className="text-ink-500">● 未触发</span>
                  )}
                </td>
                <td className="py-2.5 text-ink-500 text-xs">{formatDateTime(w.createdAt)}</td>
                <td className="py-2.5">
                  <div className="flex items-center justify-end gap-2 pr-1">
                    {w.triggered && w.mode === 'oneShot' && (
                      <button
                        type="button"
                        onClick={() => reset(w.id!)}
                        className="btn-ghost"
                        title="重置触发状态"
                      >
                        重置
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(w)}
                      className="btn-ghost"
                      title="编辑"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(w.id!)}
                      className="btn-ghost hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-ink-500 mt-3">共 {watches.length} 条监视条目</div>

      {(showAdd || editing) && (
        <AddWatchModal
          initial={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setShowAdd(false);
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
