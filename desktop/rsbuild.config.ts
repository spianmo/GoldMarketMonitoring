import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/main.tsx',
      floater: './src/floater.tsx',
    },
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  html: {
    template: ({ entryName }) =>
      entryName === 'floater' ? './src/floater.html' : './src/index.html',
    title: ({ entryName }) => (entryName === 'floater' ? '黄金悬浮窗' : '黄金盯盘'),
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
