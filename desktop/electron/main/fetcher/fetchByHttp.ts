import iconv from 'iconv-lite';
import { parsePriceFromHtml } from '@goldmarket/shared';

const TARGET_URL = 'https://perbank.czbank.com/PERBANK/WebBank';
const REFERER = 'https://perbank.czbank.com/PERBANK/unLogon_csc.jsp';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchPriceByHttp(timeoutMs = 10_000): Promise<{
  price: number;
  raw: string;
}> {
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

    const buf = Buffer.from(await res.arrayBuffer());
    const charset = (res.headers.get('content-type') ?? '').toLowerCase().includes('gbk')
      ? 'gbk'
      : 'gbk';
    const html = iconv.decode(buf, charset);

    const parsed = parsePriceFromHtml(html);
    if (!parsed) {
      throw new Error('未能从响应 HTML 中解析到金价');
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}
