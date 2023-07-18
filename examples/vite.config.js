import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsxFactory: 'Sakura.createElement'
  },
});
