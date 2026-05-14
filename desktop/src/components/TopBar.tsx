import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

function statusDot(state: string | undefined, hasError: boolean) {
  if (hasError) return 'bg-red-500';
  if (state === 'running' || state === 'idle') return 'bg-green-500';
  return 'bg-ink-300';
}

export default function TopBar() {
  const status = useAppStore((s) => s.status);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((v) => v + 1), 500);
    return () => clearInterval(t);
  }, []);

  const nextIn =
    status?.nextTickAt ? Math.max(0, Math.round((status.nextTickAt - Date.now()) / 1000)) : null;

  const hasError = !!status?.lastError && (status?.consecutiveFailures ?? 0) > 0;

  return (
    <div className="h-12 px-6 flex items-center gap-4 border-b border-ink-100 bg-white/70 backdrop-blur">
      <div className="flex items-center gap-2 text-sm">
        <span className={`inline-block h-2 w-2 rounded-full ${statusDot(status?.state, hasError)}`} />
        <span className="text-ink-700">
          {hasError ? '抓取异常' : '实时监控中'}
        </span>
      </div>
      <div className="text-sm text-ink-500">
        下次检查: <span className="text-ink-900">{nextIn != null ? `${nextIn}秒后` : '—'}</span>
      </div>
      {status && (
        <div className="text-xs text-ink-500">
          数据源:
          <span className="ml-1 px-1.5 py-0.5 rounded bg-ink-100 text-ink-700">
            {status.activeSource === 'http' ? 'HTTP 直连' : '浏览器降级'}
          </span>
        </div>
      )}
      {status?.lastError && (
        <div
          className="text-xs text-red-500 max-w-[40%] truncate"
          title={status.lastError}
        >
          {status.lastError}
        </div>
      )}
      <div className="flex-1" />
      <div className="text-xs text-ink-500">
        浙商银行公开行情 · 元/克
      </div>
    </div>
  );
}
