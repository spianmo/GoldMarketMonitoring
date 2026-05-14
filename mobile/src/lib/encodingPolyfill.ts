import { TextDecoder as TextDecoderPolyfill, TextEncoder as TextEncoderPolyfill } from 'text-encoding';

function ensureGBK(): void {
  const g = globalThis as Record<string, unknown>;

  let canDecodeGBK = false;
  if (typeof g.TextDecoder === 'function') {
    try {
      const sample = new Uint8Array([0xd6, 0xd0]);
      const out = new (g.TextDecoder as typeof TextDecoder)('gbk').decode(sample);
      canDecodeGBK = out.length > 0;
    } catch {
      canDecodeGBK = false;
    }
  }

  if (!canDecodeGBK) {
    (g as { TextDecoder: typeof TextDecoderPolyfill }).TextDecoder = TextDecoderPolyfill;
    if (typeof g.TextEncoder !== 'function') {
      (g as { TextEncoder: typeof TextEncoderPolyfill }).TextEncoder = TextEncoderPolyfill;
    }
  }
}

ensureGBK();

export {};
