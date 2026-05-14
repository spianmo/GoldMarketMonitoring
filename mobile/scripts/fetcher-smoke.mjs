#!/usr/bin/env node
// Smoke test (Node-only, 不引 TS):验证 URL + body + GBK 解码 + 正则提取
const TARGET_URL = 'https://perbank.czbank.com/PERBANK/WebBank';
const REFERER = 'https://perbank.czbank.com/PERBANK/unLogon_csc.jsp';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const PRICE_TAG_RE = /<b>\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{1,4})\s*<em>\s*元\s*\/\s*克/;

const res = await fetch(TARGET_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': UA,
    Referer: REFERER,
    Accept: 'text/html,*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  },
  body: 'dse_operationName=finMatUnLogonQrySrvOp',
});

console.log('HTTP', res.status, res.headers.get('content-type'));
const buf = Buffer.from(await res.arrayBuffer());
console.log('SIZE', buf.length);

const html = new TextDecoder('gbk').decode(buf);
const m = html.match(PRICE_TAG_RE);
if (m) {
  const raw = m[1];
  const price = Number(raw.replace(/,/g, ''));
  console.log(`PARSED: { price: ${price}, raw: "${raw}" }`);
} else {
  console.log('NO MATCH; sample around 元/克:');
  const idx = html.indexOf('元/克');
  console.log(html.slice(Math.max(0, idx - 80), idx + 20));
  process.exit(1);
}
