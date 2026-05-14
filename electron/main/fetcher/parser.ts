import * as cheerio from 'cheerio';

const PRICE_RE = /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{1,4})/;

export function parsePriceFromHtml(html: string): { price: number; raw: string } | null {
  const $ = cheerio.load(html);

  const candidates: string[] = [];
  $('b').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('元/克') || /[0-9]/.test(text)) candidates.push(text);
  });

  for (const text of candidates) {
    if (!text.includes('元/克')) continue;
    const m = text.match(PRICE_RE);
    if (m) {
      const raw = m[1];
      const price = Number(raw.replace(/,/g, ''));
      if (Number.isFinite(price) && price > 0) return { price, raw };
    }
  }

  const bodyText = $('body').text();
  const idx = bodyText.indexOf('元/克');
  if (idx > -1) {
    const around = bodyText.slice(Math.max(0, idx - 40), idx);
    const m = around.match(PRICE_RE);
    if (m) {
      const price = Number(m[1].replace(/,/g, ''));
      if (Number.isFinite(price) && price > 0) {
        return { price, raw: m[1] };
      }
    }
  }
  return null;
}
