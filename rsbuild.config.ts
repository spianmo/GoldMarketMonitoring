import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: './src/main.tsx' },
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  html: {
    template: './src/index.html',
    title: '黄金盯盘',
  },
  output: {
    distPath: { root: 'dist/renderer' },
    assetPrefix: './',
    target: 'web',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  dev: {
    writeToDisk: false,
  },
  performance: {
    chunkSplit: { strategy: 'split-by-experience' },
  },
});
