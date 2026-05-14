import type { WatchItem, WatchOperator } from './types';

export const OPERATOR_LABEL: Record<WatchOperator, string> = {
  priceGte: '价格 ≥',
  priceLte: '价格 ≤',
  pctChangeGte: '涨跌幅 ≥',
  pctChangeLte: '涨跌幅 ≤',
  deltaGte: '变动金额 ≥',
};

export function describeCondition(item: WatchItem): string {
  const t = item.threshold;
  switch (item.operator) {
    case 'priceGte':
      return `价格 ≥ ${t.toFixed(2)}`;
    case 'priceLte':
      return `价格 ≤ ${t.toFixed(2)}`;
    case 'pctChangeGte':
      return `涨跌幅 ≥ ${t.toFixed(2)}%`;
    case 'pctChangeLte':
      return `涨跌幅 ≤ ${t.toFixed(2)}%`;
    case 'deltaGte':
      return `变动金额 ≥ ${t.toFixed(2)} 元`;
  }
}

export interface EvalContext {
  currentPrice: number;
  prevPrice: number | null;
  dayOpenPrice: number | null;
}

export function evaluate(item: WatchItem, ctx: EvalContext): boolean {
  if (!item.enabled) return false;
  switch (item.operator) {
    case 'priceGte':
      return ctx.currentPrice >= item.threshold;
    case 'priceLte':
      return ctx.currentPrice <= item.threshold;
    case 'pctChangeGte': {
      if (ctx.dayOpenPrice == null || ctx.dayOpenPrice === 0) return false;
      const pct = ((ctx.currentPrice - ctx.dayOpenPrice) / ctx.dayOpenPrice) * 100;
      return pct >= item.threshold;
    }
    case 'pctChangeLte': {
      if (ctx.dayOpenPrice == null || ctx.dayOpenPrice === 0) return false;
      const pct = ((ctx.currentPrice - ctx.dayOpenPrice) / ctx.dayOpenPrice) * 100;
      return pct <= item.threshold;
    }
    case 'deltaGte': {
      if (ctx.prevPrice == null) return false;
      return Math.abs(ctx.currentPrice - ctx.prevPrice) >= item.threshold;
    }
  }
}

export function alertMessage(item: WatchItem, ctx: EvalContext): string {
  const cur = ctx.currentPrice.toFixed(2);
  switch (item.operator) {
    case 'priceGte':
      return `金价已达到 ${cur} 元/克 (≥ ${item.threshold.toFixed(2)})`;
    case 'priceLte':
      return `金价已跌至 ${cur} 元/克 (≤ ${item.threshold.toFixed(2)})`;
    case 'pctChangeGte':
    case 'pctChangeLte': {
      const base = ctx.dayOpenPrice ?? ctx.currentPrice;
      const pct = ((ctx.currentPrice - base) / base) * 100;
      return `当前 ${cur} 元/克,日内涨跌 ${pct.toFixed(2)}% (阈值 ${item.threshold.toFixed(2)}%)`;
    }
    case 'deltaGte': {
      const prev = ctx.prevPrice ?? ctx.currentPrice;
      const d = ctx.currentPrice - prev;
      const sign = d >= 0 ? '+' : '';
      return `单次变动 ${sign}${d.toFixed(2)} 元 (阈值 ${item.threshold.toFixed(2)} 元),当前 ${cur} 元/克`;
    }
  }
}
