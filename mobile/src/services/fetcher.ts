import { Platform } from 'react-native';
import { parsePriceFromHtml } from '@goldmarket/shared';
import { SafeTextDecoder } from '@/lib/encodingPolyfill';

const NATIVE_URL = 'https://perbank.czbank.com/PERBANK/WebBank';
const NATIVE_REFERER = 'https://perbank.czbank.com/PERBANK/unLogon_csc.jsp';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const WEB_PROXY_PATH = '/__proxy/czbank/WebBank';

function resolveUrl(): string {
  if (Platform.OS !== 'web') return NATIVE_URL;
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${WEB_PROXY_PATH}`;
  }
  return WEB_PROXY_PATH;
}

export interface FetchResult {
  price: number;
  raw: string;
  ts: number;
}

const PRICE_ASCII_RE = /<b[^>]*>\s*([0-9]{1,4}(?:,[0-9]{3})*\.[0-9]{1,4})\s*<em/g;

function bytesToLatin1(bytes: Uint8Array): string {
  const CHUNK = 0x4000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return out;
}

function parseAsciiPrice(html: string): { price: number; raw: string } | null {
  PRICE_ASCII_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRICE_ASCII_RE.exec(html)) !== null) {
    const raw = m[1];
    const price = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(price) && price >= 100 && price <= 10_000) return { price, raw };
  }
  return null;
}

export async function fetchPrice(timeoutMs = 10_000): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const isWeb = Platform.OS === 'web';
  const url = resolveUrl();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,*/*',
    };
    if (!isWeb) {
      // Browser fetch refuses to set these "forbidden" headers; the proxy sets them upstream instead.
      headers['User-Agent'] = UA;
      headers['Referer'] = NATIVE_REFERER;
      headers['Accept-Language'] = 'zh-CN,zh;q=0.9';
    }

    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: 'dse_operationName=finMatUnLogonQrySrvOp',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const ab = await res.arrayBuffer();
    const bytes = new Uint8Array(ab);

    let html: string | null = null;
    try {
      html = new SafeTextDecoder('gbk').decode(bytes);
    } catch {
      html = null;
    }

    if (html) {
      const parsed = parsePriceFromHtml(html);
      if (parsed) return { price: parsed.price, raw: parsed.raw, ts: Date.now() };
    }

    // GBK 不可用或解析未命中 → 字节按 latin1 直通,只匹配 ASCII 价格片段
    const latin1 = bytesToLatin1(bytes);
    const parsed = parseAsciiPrice(latin1);
    if (parsed) return { price: parsed.price, raw: parsed.raw, ts: Date.now() };

    const snippet = latin1.replace(/[^\x20-\x7e]+/g, '·').slice(0, 200);
    throw new Error(`未能解析金价(GBK 解码${html ? '成功但未命中规则' : '不可用'};bytes=${bytes.byteLength})· ASCII 片段:${snippet}`);
  } finally {
    clearTimeout(timer);
  }
}
