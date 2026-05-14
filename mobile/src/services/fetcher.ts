import { Platform } from 'react-native';
import { parsePriceFromHtml } from '@goldmarket/shared';

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
    const html = new TextDecoder('gbk').decode(new Uint8Array(ab));
    const parsed = parsePriceFromHtml(html);
    if (!parsed) {
      throw new Error('未能从响应 HTML 中解析到金价');
    }
    return { price: parsed.price, raw: parsed.raw, ts: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}
