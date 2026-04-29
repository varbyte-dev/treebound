import { defineConfig } from 'vite';

export default defineConfig({
  // El entry point es el index.html en la raíz
  root: '.',
  resolve: {
    alias: {
      'treebound': '/src/index.ts',
    },
  },
  esbuild: {
    // Soporte para decoradores experimentales de TypeScript
    target: 'es2020',
  },
});
