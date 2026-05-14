import { parsePriceFromHtml } from '@goldmarket/shared';

const TARGET_URL = 'https://perbank.czbank.com/PERBANK/WebBank';
const REFERER = 'https://perbank.czbank.com/PERBANK/unLogon_csc.jsp';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

export interface FetchResult {
  price: number;
  raw: string;
  ts: number;
}

export async function fetchPrice(timeoutMs = 10_000): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        Referer: REFERER,
        Accept: 'text/html,*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
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
