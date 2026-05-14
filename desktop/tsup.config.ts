import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'electron/main/index.ts' },
    outDir: 'dist/main',
    format: ['cjs'],
    target: 'node20',
    platform: 'node',
    sourcemap: true,
    clean: true,
    splitting: false,
    shims: false,
    external: ['electron'],
  },
  {
    entry: { index: 'electron/preload/index.ts' },
    outDir: 'dist/preload',
    format: ['cjs'],
    target: 'node20',
    platform: 'node',
    sourcemap: true,
    clean: true,
    splitting: false,
    shims: false,
    external: ['electron'],
  },
]);
