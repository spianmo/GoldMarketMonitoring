import 'text-encoding/lib/encoding-indexes';
import { TextDecoder as TextDecoderPolyfill } from 'text-encoding';

const GBK_SAMPLE = new Uint8Array([0xd6, 0xd0, 0xb9, 0xfa]);
const GBK_EXPECT = '中国';

function canDecodeGBK(Ctor: unknown): boolean {
  if (typeof Ctor !== 'function') return false;
  try {
    const out = new (Ctor as typeof TextDecoder)('gbk').decode(GBK_SAMPLE);
    return out === GBK_EXPECT;
  } catch {
    return false;
  }
}

let cached: typeof TextDecoder | null = null;

function resolveDecoder(): typeof TextDecoder {
  if (cached) return cached;
  const native = (globalThis as { TextDecoder?: unknown }).TextDecoder;
  if (canDecodeGBK(native)) {
    cached = native as typeof TextDecoder;
    return cached;
  }
  if (canDecodeGBK(TextDecoderPolyfill)) {
    cached = TextDecoderPolyfill as unknown as typeof TextDecoder;
    return cached;
  }
  throw new Error(
    'no GBK-capable TextDecoder (native rejected gbk, text-encoding polyfill rejected gbk — encoding-indexes likely missing)',
  );
}

export class SafeTextDecoder {
  private inner: InstanceType<typeof TextDecoder>;
  constructor(label?: string, options?: TextDecoderOptions) {
    const Ctor = resolveDecoder();
    this.inner = new Ctor(label, options);
  }
  decode(input?: ArrayBufferView | ArrayBuffer, options?: { stream?: boolean }): string {
    return this.inner.decode(input as ArrayBufferView, options);
  }
  get encoding(): string {
    return this.inner.encoding;
  }
}
