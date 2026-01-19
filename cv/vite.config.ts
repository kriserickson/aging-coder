import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname),
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'CVBundle',
      formats: ['iife'],
      fileName: () => 'cv.js'
    },
    outDir: path.resolve(__dirname, '../assets/js'),
    emptyOutDir: false,
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  test: {
    environment: 'node'
  }
}));
