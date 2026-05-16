/**
 * Bark 推送客户端 — 跨平台(Node/Electron/RN/Browser)纯 fetch 实现
 *
 * 用户配置的是一个完整的设备 URL,形如:
 *   https://api.day.app/rYc7etuCgSdknHRWvnMtGV/
 *   https://api.day.app/rYc7etuCgSdknHRWvnMtGV          (末尾斜杠可选)
 *   https://bark.example.com/rYc7etuCgSdknHRWvnMtGV/    (自建服务器)
 *
 * 实际推送时,我们用 POST JSON 到 base URL,而不是把 title/body 拼在 path 里
 * —— 这样能正确处理 emoji 和换行,且不会因 URL 编码长度限制丢内容。
 *
 * Ref: https://bark.day.app/#/tutorial
 */

export interface BarkConfig {
  /** 完整 URL,如 https://api.day.app/<DeviceKey>/ */
  url: string;
}

export type BarkLevel = 'active' | 'timeSensitive' | 'passive' | 'critical';

export interface BarkPayload {
  title: string;
  body: string;
  /**
   * 通知级别 — 默认 active。
   * - active:正常显示
   * - timeSensitive:即时(可穿透勿扰)
   * - passive:不亮屏
   * - critical:重要警告(穿透静音)
   */
  level?: BarkLevel;
  /** 通知声音名(参考 Bark App 内置列表) */
  sound?: string;
  /** 通知图标 URL(http/https) */
  icon?: string;
  /** 通知分组标题 */
  group?: string;
  /** 角标数字(0 清除) */
  badge?: number;
  /** 点击通知跳转的 URL */
  jumpUrl?: string;
  /** 是否归档:'0' 不归档 / '1' 归档(默认 Bark 自身设置) */
  isArchive?: '0' | '1';
  /** 自定义 call:'1' 拨打电话提醒(配合 sound) */
  call?: '0' | '1';
}

export interface BarkResult {
  ok: boolean;
  status: number;
  message?: string;
}

const TRAILING_SLASH = /\/+$/;

/** 把任意用户输入规范化为以 `/` 结尾的 base URL */
export function normalizeBarkUrl(input: string): string {
  return input.trim().replace(TRAILING_SLASH, '') + '/';
}

/**
 * 校验 URL 形状是否符合 Bark 设备 URL:
 *   protocol = http/https
 *   path 段恰好是 /<key>(可选末尾 /)
 *   key 仅含字母数字下划线短横
 */
export function isValidBarkUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  return /^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);
}

export interface PushOptions {
  /** 请求超时毫秒,默认 8000 */
  timeoutMs?: number;
}

export async function pushToBark(
  config: BarkConfig,
  payload: BarkPayload,
  opts: PushOptions = {},
): Promise<BarkResult> {
  if (!isValidBarkUrl(config.url)) {
    return { ok: false, status: 0, message: 'Bark URL 格式不正确,需如 https://api.day.app/<DeviceKey>/' };
  }
  const url = normalizeBarkUrl(config.url);

  const body: Record<string, unknown> = {
    title: payload.title,
    body: payload.body,
    level: payload.level ?? 'active',
    group: payload.group ?? '黄金盯盘',
  };
  if (payload.sound) body.sound = payload.sound;
  if (payload.icon) body.icon = payload.icon;
  if (payload.badge != null) body.badge = payload.badge;
  if (payload.jumpUrl) body.url = payload.jumpUrl;
  if (payload.isArchive) body.isArchive = payload.isArchive;
  if (payload.call) body.call = payload.call;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as
      | { code?: number; message?: string }
      | null;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: data?.message ?? `HTTP ${res.status}`,
      };
    }
    const ok = data?.code === 200;
    return {
      ok,
      status: res.status,
      message: data?.message ?? (ok ? 'success' : 'unknown response'),
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, status: 0, message: '请求超时' };
    }
    return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
