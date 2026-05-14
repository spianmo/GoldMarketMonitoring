const PRICE_TAG_RE = /<b>\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{1,4})\s*<em>\s*元\s*\/\s*克/;
const PRICE_FALLBACK_RE = /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{1,4})\s*(?:<em>)?\s*元\s*\/\s*克/;
const NUMBER_RE = /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{1,4})/;

export interface ParsedPrice {
  price: number;
  raw: string;
}

export function parsePriceFromHtml(html: string): ParsedPrice | null {
  const m1 = html.match(PRICE_TAG_RE);
  if (m1) {
    const raw = m1[1];
    const price = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(price) && price > 0) return { price, raw };
  }

  const m2 = html.match(PRICE_FALLBACK_RE);
  if (m2) {
    const raw = m2[1];
    const price = Number(raw.replace(/,/g, ''));
    if (Number.isFinite(price) && price > 0) return { price, raw };
  }

  const idx = html.indexOf('元/克');
  if (idx > -1) {
    const around = html.slice(Math.max(0, idx - 64), idx);
    const m3 = around.match(NUMBER_RE);
    if (m3) {
      const raw = m3[1];
      const price = Number(raw.replace(/,/g, ''));
      if (Number.isFinite(price) && price > 0) return { price, raw };
    }
  }

  return null;
}
